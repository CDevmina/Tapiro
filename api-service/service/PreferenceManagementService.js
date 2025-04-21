const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { ObjectId } = require('mongodb');
const AIService = require('../clients/AIService');

exports.getUserOwnPreferences = async function (req) {
  try {
    // Get user data from middleware
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const db = getDB();

    // Check cache first - standardized cache key
    const cacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;
    const cachedPreferences = await getCache(cacheKey);
    if (cachedPreferences) {
      // Ensure privacySettings are not included in the cached response being returned
      const prefs = JSON.parse(cachedPreferences);
      delete prefs.privacySettings;
      return respondWithCode(200, prefs);
    }

    // Find user in database, only selecting necessary fields
    const user = await db.collection('users').findOne(
        { auth0Id: userData.sub },
        { projection: { _id: 1, preferences: 1, updatedAt: 1 } } // Select only needed fields
    );
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Prepare the response object without privacySettings
    const preferencesResponse = {
      userId: user._id.toString(),
      preferences: user.preferences || [],
      // REMOVED privacySettings
      updatedAt: user.updatedAt || new Date(),
    };

    // Cache the preferences result (without privacySettings) with specific TTL
    // Note: Caching the minimal response. If optimistic updates need privacySettings,
    // they might need to fetch the full user profile or adjust logic.
    await setCache(cacheKey, JSON.stringify(preferencesResponse), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, preferencesResponse);
  } catch (error) {
    console.error('Get preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Opt out from store data collection
 */
exports.optOutFromStore = async function (req, storeId) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    let storeObjectId;
    try {
      storeObjectId = new ObjectId(storeId);
    } catch (error) {
      return respondWithCode(400, {
        code: 400,
        message: 'Invalid store ID format',
      });
    }

    // Validate that store exists - use ObjectId
    const storeExists = await db.collection('stores').findOne({ _id: storeObjectId });
    if (!storeExists) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Remove from opt-in list and add to opt-out list
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $pull: { 'privacySettings.optInStores': storeId },
        $addToSet: { 'privacySettings.optOutStores': storeId },
        $set: { updatedAt: new Date() },
      },
    );

    // Clear relevant caches
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`); // User profile cache might contain privacy settings

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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // If preferences are provided, send to FastAPI for processing
    if (body.preferences) {
      try {
        // Call the AI service to process preferences
        await AIService.updateUserPreferences(
          userData.sub,
          user.email, // Use email from the found user document
          body.preferences
        );
      } catch (error) {
        console.error('Failed to process preferences through AI service:', error);
        // Continue with the update, we'll use the raw preferences without validation for now
      }
    }

    // Update preferences in the database
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          preferences: body.preferences || [],
          updatedAt: new Date(),
        },
      },
    );

     // Fetch the updated user data to get the latest timestamp
    const updatedUser = await db.collection('users').findOne(
        { _id: user._id },
        { projection: { preferences: 1, updatedAt: 1 } }
    );


    // Clear related caches
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

    // Clear store-specific preference caches as preferences changed
    if (user.privacySettings?.optInStores) {
      for (const storeId of user.privacySettings.optInStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
      }
    }

    // Return updated preferences object (without privacySettings)
    const preferencesResponse = {
      userId: user._id.toString(),
      preferences: updatedUser.preferences || [],
      updatedAt: updatedUser.updatedAt, // Use the actual updated timestamp
    };

     // Update the cache with the minimal response
    const cacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;
    await setCache(cacheKey, JSON.stringify(preferencesResponse), { EX: CACHE_TTL.USER_DATA });


    return respondWithCode(200, preferencesResponse);
  } catch (error) {
    console.error('Update user preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Opt in to store data collection
 */
exports.optInToStore = async function (req, storeId) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const db = getDB();

    // Find user in database using Auth0 ID
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    let storeObjectId;
    try {
      storeObjectId = new ObjectId(storeId);
    } catch (error) {
      return respondWithCode(400, {
        code: 400,
        message: 'Invalid store ID format',
      });
    }

    // Validate that store exists - use ObjectId
    const storeExists = await db.collection('stores').findOne({ _id: storeObjectId });
    if (!storeExists) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Add store to opt-in list AND remove from opt-out list if present
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $addToSet: { 'privacySettings.optInStores': storeId },
        $pull: { 'privacySettings.optOutStores': storeId },
        $set: { updatedAt: new Date() },
      },
    );

    // Clear relevant caches
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`); // User profile cache might contain privacy settings

    return respondWithCode(204);
  } catch (error) {
    console.error('Opt in to store failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get user's store opt-in/out lists with store names
 */
exports.getStoreConsentLists = async function (req) {
  try {
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const db = getDB();

    // Find user in database using Auth0 ID, projecting only necessary fields
    const user = await db.collection('users').findOne(
      { auth0Id: userData.sub },
      { projection: { 'privacySettings.optInStores': 1, 'privacySettings.optOutStores': 1, _id: 0 } } // Only get opt-in/out lists
    );

    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    const optInIds = user.privacySettings?.optInStores || [];
    const optOutIds = user.privacySettings?.optOutStores || [];
    const allStoreIds = [...new Set([...optInIds, ...optOutIds])];

    // Convert string IDs to ObjectIds for the query, handling potential errors
    const storeObjectIds = allStoreIds.map(id => {
      try {
        // Ensure the ID is a valid ObjectId string before converting
        if (ObjectId.isValid(id)) {
          return new ObjectId(id);
        }
        console.warn(`Invalid ObjectId format in consent list: ${id}`);
        return null;
      } catch (e) {
        console.warn(`Error converting ObjectId in consent list: ${id}`, e);
        return null;
      }
    }).filter(id => id !== null); // Filter out invalid/null IDs


    let storeNameMap = {};
    if (storeObjectIds.length > 0) {
      const stores = await db.collection('stores').find(
        { _id: { $in: storeObjectIds } },
        { projection: { _id: 1, name: 1 } }
      ).toArray();

      storeNameMap = stores.reduce((map, store) => {
        map[store._id.toString()] = store.name;
        return map;
      }, {});
    }


    // Map IDs to objects with names
    const mapIdsToDetails = (ids) => ids.map(id => ({
      storeId: id,
      name: storeNameMap[id] || 'Unknown Store' // Provide a fallback name
    }));

    const consentListsWithDetails = {
      optInStores: mapIdsToDetails(optInIds),
      optOutStores: mapIdsToDetails(optOutIds),
    };

    // Note: Caching could be added here if needed, potentially using a specific key
    // or relying on the USER_DATA cache invalidation from opt-in/out actions.

    return respondWithCode(200, consentListsWithDetails); // Return the detailed lists
  } catch (error) {
    console.error('Get store consent lists failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
