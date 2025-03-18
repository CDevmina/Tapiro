const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache } = require('../utils/redisUtil');
const axios = require('axios');

/**
 * Get user preferences for targeted advertising
 *
 * @param {Object} req - Request object
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} User preferences
 */
exports.getUserPreferences = async function (req, userId) {
  try {
    // Validate storeId is set by the API key middleware
    if (!req.storeId) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid API key',
      });
    }

    const db = getDB();

    // Try cache first (store-specific user preferences)
    const cachedPrefs = await getCache(`prefs:${userId}:${req.storeId}`);
    if (cachedPrefs) {
      return respondWithCode(200, JSON.parse(cachedPrefs));
    }

    // Find user in database
    const user = await db.collection('users').findOne({
      $or: [{ _id: userId }, { auth0Id: userId }, { username: userId }, { email: userId }],
    });

    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Check if user has opted out from this store
    if (user.privacySettings?.optOutStores?.includes(req.storeId)) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has opted out from this store',
      });
    }

    // Check for consent
    if (!user.privacySettings?.dataSharingConsent) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
    }

    // Prepare user preferences
    const preferences = {
      userId: user._id.toString(),
      interests: user.preferences || [],
      // Additional demographic data would be here if available
      demographics: {
        ageRange: user.demographics?.ageRange || 'unknown',
        location: user.demographics?.location || 'unknown',
      },
    };

    // Cache the preferences
    await setCache(`prefs:${userId}:${req.storeId}`, JSON.stringify(preferences), { EX: 3600 });

    return respondWithCode(200, preferences);
  } catch (error) {
    console.error('Get user preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Opt out from store data collection
 *
 * @param {Object} req - Request object
 * @param {Object} body - Request body containing storeId
 * @returns {Promise<Object>} Empty response with 204 status
 */
exports.optOutFromStore = async function (req, body) {
  try {
    // Security check - must have authorization token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Get store ID from request body
    const { storeId } = body;
    if (!storeId) {
      return respondWithCode(400, {
        code: 400,
        message: 'Store ID is required',
      });
    }

    // Validate that store exists
    const storeExists = await db.collection('stores').findOne({ _id: storeId });
    if (!storeExists) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Add store to opt-out list
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $addToSet: { 'privacySettings.optOutStores': storeId },
        $set: { updatedAt: new Date() },
      },
    );

    // Clear cache
    await setCache(`prefs:${user._id}:${storeId}`, '', { EX: 1 });

    return respondWithCode(204);
  } catch (error) {
    console.error('Opt out from store failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Submit user data for analysis
 *
 * @param {Object} req - Request object
 * @param {Object} body - User data
 * @returns {Promise<Object>} Confirmation message
 */
exports.submitUserData = async function (req, body) {
  try {
    // Validate storeId is set by the API key middleware
    if (!req.storeId) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid API key',
      });
    }

    const db = getDB();
    const { email, dataType, entries } = body;

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Check user consent
    if (!user.privacySettings?.dataSharingConsent) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
    }

    // Check if user has opted out from this store
    if (user.privacySettings?.optOutStores?.includes(req.storeId)) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has opted out from this store',
      });
    }

    // Store the data in appropriate collection
    await db.collection('userData').insertOne({
      userId: user._id,
      storeId: req.storeId,
      email,
      dataType,
      entries,
      timestamp: new Date(),
    });

    // Invalidate the preferences cache
    await setCache(`prefs:${user._id}:${req.storeId}`, '', { EX: 1 });

    return respondWithCode(202, {
      message: 'Data accepted for processing',
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error('Submit user data failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update user preferences
 *
 * @param {Object} req - Request object
 * @param {Object} body - Request body containing preferences
 * @returns {Promise<Object>} Updated preferences
 */
exports.updateUserPreferences = async function (req, body) {
  try {
    // Security check - must have authorization token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Update only preferences
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: { 
          preferences: body.preferences || [],
          updatedAt: new Date() 
        },
      },
    );

    // Get updated user data
    const updatedUser = await db.collection('users').findOne({ _id: user._id });

    // Clear related caches
    if (user.privacySettings?.optOutStores) {
      for (const storeId of user.privacySettings.optOutStores) {
        await setCache(`prefs:${user._id}:${storeId}`, '', { EX: 1 });
      }
    }

    // Return updated preferences
    const preferences = {
      userId: updatedUser._id.toString(),
      interests: updatedUser.preferences || [],
      demographics: {
        ageRange: updatedUser.demographics?.ageRange || 'unknown',
        location: updatedUser.demographics?.location || 'unknown',
      },
    };

    return respondWithCode(200, preferences);
  } catch (error) {
    console.error('Update user preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Opt in to store data collection
 *
 * @param {Object} req - Request object
 * @param {Object} body - Request body containing storeId
 * @returns {Promise<Object>} Empty response with 204 status
 */
exports.optInToStore = async function (req, body) {
  try {
    // Security check - must have authorization token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Get store ID from request body
    const { storeId } = body;
    if (!storeId) {
      return respondWithCode(400, {
        code: 400,
        message: 'Store ID is required',
      });
    }

    // Validate that store exists
    const storeExists = await db.collection('stores').findOne({ _id: storeId });
    if (!storeExists) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Remove store from opt-out list
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $pull: { 'privacySettings.optOutStores': storeId },
        $set: { updatedAt: new Date() },
      },
    );

    // Clear cache
    await setCache(`prefs:${user._id}:${storeId}`, '', { EX: 1 });

    return respondWithCode(204);
  } catch (error) {
    console.error('Opt in to store failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};