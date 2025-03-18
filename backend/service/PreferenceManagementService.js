const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

exports.getUserOwnPreferences = async function (req) {
  try {
    // Get user data from middleware
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);
    
    const db = getDB();
    
    // Check cache first - standardized cache key
    const cacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;
    const cachedPreferences = await getCache(cacheKey);
    if (cachedPreferences) {
      return respondWithCode(200, JSON.parse(cachedPreferences));
    }

    // Find user in database
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Return just the preferences part
    const preferences = {
      userId: user._id.toString(),
      interests: user.preferences || [],
      demographics: user.demographics || {
        ageRange: 'unknown',
        location: 'unknown'
      }
    };

    // Cache the preferences result with specific TTL
    await setCache(cacheKey, JSON.stringify(preferences), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, preferences);
  } catch (error) {
    console.error('Get preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Opt out from store data collection
 */
exports.optOutFromStore = async function (req, body) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);
    
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

    // Clear cache using standardized approach
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

    return respondWithCode(204);
  } catch (error) {
    console.error('Opt out from store failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update user preferences
 */
exports.updateUserPreferences = async function (req, body) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);
    
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

    // Clear related caches using the invalidation helper
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);
    
    // Clear store-specific preference caches
    if (user.privacySettings?.optOutStores) {
      for (const storeId of user.privacySettings.optOutStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
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
 */
exports.optInToStore = async function (req, body) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);
    
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

    // Clear cache using invalidation helper
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

    return respondWithCode(204);
  } catch (error) {
    console.error('Opt in to store failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};