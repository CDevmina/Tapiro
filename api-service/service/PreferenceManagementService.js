const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { ObjectId } = require('mongodb');
// Removed AIService require as it's no longer used here
// const AIService = require('../clients/AIService');
const TaxonomyService = require('../service/TaxonomyService'); // Import TaxonomyService

exports.getUserOwnPreferences = async function (req) {
  try {
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const db = getDB();
    const cacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;

    // Cache check remains the same conceptually, but ensure cached data includes attributes if needed by frontend
    const cachedPreferences = await getCache(cacheKey);
    if (cachedPreferences) {
      // Assuming cache stores the full preference structure including attributes
      return respondWithCode(200, JSON.parse(cachedPreferences));
    }

    // Fetch user, including the full preferences array (with attributes)
    const user = await db.collection('users').findOne(
        { auth0Id: userData.sub },
        // Ensure 'preferences' field is projected correctly, including nested 'attributes'
        { projection: { _id: 1, preferences: 1, updatedAt: 1 } }
    );
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Prepare response - includes attributes now
    const preferencesResponse = {
      userId: user._id.toString(),
      preferences: user.preferences || [], // This now includes attributes if stored
      updatedAt: user.updatedAt || new Date(),
    };

    // Cache the full response (including attributes)
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
    if (!body.preferences || !Array.isArray(body.preferences)) {
         return respondWithCode(400, { code: 400, message: 'Preferences array is required and must be an array.' });
    }

    // --- Validation against Taxonomy ---
    let taxonomyDoc;
    try {
      // Use the TaxonomyService to get the current taxonomy data
      taxonomyDoc = await TaxonomyService.getLatestTaxonomy(); // Assuming this function exists and returns the structure
      if (!taxonomyDoc || !taxonomyDoc.data || !taxonomyDoc.data.categories) {
        throw new Error('Taxonomy data is unavailable for validation.');
      }
    } catch (taxError) {
      console.error("Failed to load taxonomy for validation:", taxError);
      return respondWithCode(500, { code: 500, message: 'Internal error: Could not load taxonomy for validation.' });
    }

    const categoryMap = new Map(taxonomyDoc.data.categories.map(cat => [cat.id, cat]));
    const validationErrors = [];

    for (const pref of body.preferences) {
      if (!pref || typeof pref !== 'object') {
        validationErrors.push(`Invalid preference item format: ${JSON.stringify(pref)}`);
        continue;
      }
      if (!pref.category || typeof pref.category !== 'string') {
        validationErrors.push(`Preference item missing or invalid category ID: ${JSON.stringify(pref)}`);
        continue;
      }
      if (pref.score == null || typeof pref.score !== 'number' || pref.score < 0 || pref.score > 1) {
         validationErrors.push(`Preference item for category ${pref.category} has invalid score: ${pref.score}`);
         continue;
      }

      const categoryDefinition = categoryMap.get(pref.category);
      if (!categoryDefinition) {
        validationErrors.push(`Invalid category ID used in preference: ${pref.category}`);
        continue;
      }

      const validAttributes = new Set(categoryDefinition.attributes?.map(attr => attr.name) || []);
      const validatedAttributes = {};

      if (pref.attributes && typeof pref.attributes === 'object') {
        for (const attrKey in pref.attributes) {
          if (!validAttributes.has(attrKey)) {
            validationErrors.push(`Invalid attribute '${attrKey}' for category ${pref.category} (${categoryDefinition.name}). Valid attributes are: ${Array.from(validAttributes).join(', ')}`);
          } else {
            // Basic validation: ensure value is a string (can be enhanced)
            if (typeof pref.attributes[attrKey] !== 'string') {
                 validationErrors.push(`Attribute '${attrKey}' for category ${pref.category} must have a string value.`);
            } else {
                validatedAttributes[attrKey] = pref.attributes[attrKey];
            }
          }
        }
      }
       // Only add if no validation errors for this specific preference item occurred during attribute check
       if (!validationErrors.some(err => err.includes(`category ${pref.category}`))) {
           validatedPreferences.push({
               category: pref.category,
               score: pref.score,
               // Only include attributes if they exist and passed validation
               ...(Object.keys(validatedAttributes).length > 0 && { attributes: validatedAttributes }),
           });
       }
    }

    if (validationErrors.length > 0) {
        console.warn('Preference validation failed:', validationErrors);
        return respondWithCode(400, { code: 400, message: 'Invalid preference data provided.', details: validationErrors });
    }
    // --- End Validation ---


    // Update preferences in the database using the validated list
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          preferences: validatedPreferences, // Use the validated array (includes attributes)
          updatedAt: new Date(),
        },
      },
    );

    // Fetch updated user data to return and cache
     const updatedUser = await db.collection('users').findOne(
         { _id: user._id },
         { projection: { preferences: 1, updatedAt: 1 } }
     );

    // Clear relevant caches
    const userCacheKey = `${CACHE_KEYS.PREFERENCES}${userData.sub}`;
    await invalidateCache(userCacheKey);
    // Invalidate store-specific caches if needed (logic remains similar)
    if (user.privacySettings?.optInStores) {
      for (const storeId of user.privacySettings.optInStores) {
         await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${storeId}`);
      }
    }

    // Prepare and cache the response (now includes attributes)
    const preferencesResponse = {
      userId: user._id.toString(),
      preferences: updatedUser.preferences || [],
      updatedAt: updatedUser.updatedAt,
    };
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
