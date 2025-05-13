const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { ObjectId } = require('mongodb');
// Removed AIService require as it's no longer used here
// const AIService = require('../clients/AIService');
const TaxonomyService = require('./TaxonomyService'); // Import TaxonomyService

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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const db = getDB();

    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    let validatedPreferences = [];
    if (body.preferences) {
      // --- Validation ---
      if (!Array.isArray(body.preferences)) {
        return respondWithCode(400, { code: 400, message: 'Preferences must be an array.' });
      }

      // Fetch taxonomy for validation
      let taxonomyDoc;
      try {
        // Use the service function to get taxonomy (handles caching)
        const taxonomyResponse = await TaxonomyService.getTaxonomyCategories();
        if (taxonomyResponse.code !== 200) {
          throw new Error('Failed to fetch taxonomy for validation');
        }
        taxonomyDoc = taxonomyResponse.payload; // Assuming payload contains the taxonomy doc
      } catch (taxError) {
        console.error("Taxonomy fetch error during preference update:", taxError);
        return respondWithCode(500, { code: 500, message: 'Could not load taxonomy for validation.' });
      }

      const validCategoryIds = new Set(taxonomyDoc?.data?.categories?.map(cat => cat.id) || []);

      for (const pref of body.preferences) {
        // Basic structure validation
        if (typeof pref.category !== 'string' || typeof pref.score !== 'number' || pref.score < 0 || pref.score > 1) {
          return respondWithCode(400, { code: 400, message: `Invalid preference item format or score range: ${JSON.stringify(pref)}` });
        }
        // Attributes validation (if present, must be a non-null object)
        if (pref.attributes !== undefined && (typeof pref.attributes !== 'object' || pref.attributes === null || Array.isArray(pref.attributes))) {
           return respondWithCode(400, { code: 400, message: `Invalid 'attributes' format for category ${pref.category}. Must be an object.` });
        }
        // Taxonomy validation
        if (!validCategoryIds.has(pref.category)) {
          return respondWithCode(400, { code: 400, message: `Invalid category ID in preferences: ${pref.category}` });
        }
        validatedPreferences.push(pref); // Add valid preference
      }
      // --- End Validation ---

    } else {
      // If body.preferences is explicitly null or undefined, maybe clear preferences?
      // Or return an error if preferences are required for update.
      // Current behavior: If body.preferences is missing/null, validatedPreferences remains []
      // which will effectively clear preferences in the $set below.
      // If you require preferences, add:
      // return respondWithCode(400, { code: 400, message: 'Preferences array is required for update.' });
    }

    // Log the data being sent to the database for debugging
    console.log('Attempting to update preferences with:', JSON.stringify(validatedPreferences, null, 2));

    // Update preferences in the database using the validated list
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          preferences: validatedPreferences, // Use the validated array
          updatedAt: new Date(),
        },
      },
    );

    // Fetch the updated user data to get the latest timestamp and preferences
    // No need to fetch again if we trust the update, but it confirms the write
    const updatedUser = await db.collection('users').findOne(
        { _id: user._id },
        { projection: { preferences: 1, updatedAt: 1 } }
    );

    // Clear related caches
    const userCacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;
    await invalidateCache(userCacheKey);

    // Clear store-specific preference caches as preferences changed
    if (user.privacySettings?.optInStores) {
      for (const storeId of user.privacySettings.optInStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
      }
    }

    // Return updated preferences object
    const preferencesResponse = {
      userId: user._id.toString(),
      preferences: updatedUser.preferences || [], // Use actual updated preferences
      updatedAt: updatedUser.updatedAt, // Use the actual updated timestamp
    };

    // Update the cache with the new minimal response
    await setCache(userCacheKey, JSON.stringify(preferencesResponse), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, preferencesResponse);

  } catch (error) {
    // Catch MongoDB validation errors specifically if needed
    if (error.code === 121) { // MongoDB validation error code
        // Log the full details for better debugging
        console.error('Update user preferences failed MongoDB validation:', JSON.stringify(error.errInfo?.details, null, 2) || error.message);
        return respondWithCode(400, { code: 400, message: 'Preferences failed database validation.', details: error.errInfo?.details }); // Keep details for client if needed
    }
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
 * Get user's store opt-in/out lists
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

    // Prepare the response object, defaulting to empty arrays if fields don't exist
    const consentLists = {
      optInStores: user.privacySettings?.optInStores || [],
      optOutStores: user.privacySettings?.optOutStores || [],
    };

    // Note: Caching could be added here if needed, potentially using a specific key
    // or relying on the USER_DATA cache invalidation from opt-in/out actions.

    return respondWithCode(200, consentLists);
  } catch (error) {
    console.error('Get store consent lists failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
