const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache } = require('../utils/redisUtil');

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
 * Delete user data for a store
 *
 * @param {Object} req - Request object
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} Empty response with 204 status
 */
exports.deleteUserData = async function (req, userId) {
  try {
    // Security check - only users themselves should be able to delete their data
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    const db = getDB();

    // Find user in database
    const user = await db.collection('users').findOne({
      $or: [{ _id: userId }, { auth0Id: userId }],
    });

    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Get store ID from request (set by middleware)
    const storeId = req.params.storeId || req.body.storeId;
    if (!storeId) {
      return respondWithCode(400, {
        code: 400,
        message: 'Store ID is required',
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
    await setCache(`prefs:${userId}:${storeId}`, '', { EX: 1 });

    return respondWithCode(204);
  } catch (error) {
    console.error('Delete user data failed:', error);
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
