const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Get user preferences for targeted advertising
 * Used by stores via API key authentication
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

    // Try cache first using preference-specific cache key with constants
    const cacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userId}:${req.storeId}`;
    const cachedPrefs = await getCache(cacheKey);
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
      demographics: {
        ageRange: user.demographics?.ageRange || 'unknown',
        location: user.demographics?.location || 'unknown',
      },
    };

    // Cache the preferences with standardized TTL
    await setCache(cacheKey, JSON.stringify(preferences), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, preferences);
  } catch (error) {
    console.error('Get user preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Submit user data for analysis
 * Used by stores via API key authentication
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
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${req.storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${user.auth0Id}`);

    return respondWithCode(202, {
      message: 'Data accepted for processing',
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error('Submit user data failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};