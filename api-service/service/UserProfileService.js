const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { getManagementToken } = require('../utils/auth0Util');
const AIService = require('../clients/AIService');
const axios = require('axios'); // Added missing import

/**
 * Get User Profile
 * Get authenticated user's profile
 */
exports.getUserProfile = async function (req) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Try cache first using standardized cache key
    const cacheKey = `${CACHE_KEYS.USER_DATA}${userData.sub}`;
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) {
      // Ensure preferences are not included in the cached response being returned
      const userProfile = JSON.parse(cachedUser);
      delete userProfile.preferences;
      return respondWithCode(200, userProfile);
    }

    // Get from database, excluding preferences field
    const user = await db.collection('users').findOne(
      { auth0Id: userData.sub },
      { projection: { preferences: 0 } } // Exclude preferences
    );
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Cache the result (without preferences) with standardized TTL
    await setCache(cacheKey, JSON.stringify(user), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, user); // user object already excludes preferences
  } catch (error) {
    console.error('Get profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update User Profile
 * Update authenticated user's profile
 */
exports.updateUserProfile = async function (req, body) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // If username is being updated, check for uniqueness
    if (body.username) {
      const existingUser = await db.collection('users').findOne({
        username: body.username,
        auth0Id: { $ne: userData.sub },
      });

      if (existingUser) {
        return respondWithCode(409, {
          code: 409,
          message: 'Username already taken',
        });
      }
    }

    // Preferences are managed separately, remove if present in body
    // We still might need to call AI service if preferences *were* sent,
    // but we won't save them directly here.
    let preferencesToProcess = null;
    if (body.preferences) {
      preferencesToProcess = body.preferences;
      delete body.preferences; // Remove from direct update data
    }

    // If preferences were provided, send to FastAPI for processing
    if (preferencesToProcess) {
      try {
        // Find user email if not readily available (needed for AI service)
        const currentUser = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { email: 1 } });
        if (currentUser?.email) {
          await AIService.updateUserPreferences(
            userData.sub,
            currentUser.email, // Use fetched email
            preferencesToProcess
          );
          // Invalidate preferences cache as AI service might have updated them
          await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);
        } else {
           console.error('Could not find user email to process preferences via AI service.');
        }

      } catch (error) {
        console.error('Failed to process preferences through AI service:', error);
        // Decide if failure here should prevent profile update or just log
      }
    }

    // Update user
    const updateData = {
      updatedAt: new Date(),
      ...body, // Apply other updates from body (excluding preferences)
    };

    // Ensure only allowed fields are set explicitly if needed, or rely on body structure
    // Example:
    // if (body.username !== undefined) updateData.username = body.username;
    // if (body.phone !== undefined) updateData.phone = body.phone;
    // if (body.privacySettings !== undefined) updateData.privacySettings = body.privacySettings;
    // if (body.dataAccess !== undefined) updateData.dataAccess = body.dataAccess;


    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: userData.sub },
        { $set: updateData },
        { returnDocument: 'after', projection: { preferences: 0 } }, // Exclude preferences from returned doc
      );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Invalidate user data cache
    const cacheKey = `${CACHE_KEYS.USER_DATA}${userData.sub}`;
    await invalidateCache(cacheKey);

    // If privacy settings change, it might affect store data access, invalidate those too:
    if (updateData.privacySettings && result.privacySettings?.optInStores) {
       // Invalidate store-specific preference caches for opted-in stores
       const userObjectId = result._id; // Get the actual ObjectId
       for (const storeId of result.privacySettings.optInStores) {
         await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`);
       }
    }


    // Update cache with the new data (without preferences)
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, result); // result already excludes preferences
  } catch (error) {
    console.error('Update profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete User Profile
 * Delete authenticated user's profile
 */
exports.deleteUserProfile = async function (req) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Find user to get ID for cache invalidation later
    const user = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { _id: 1, privacySettings: 1 } });
     if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }
    const userObjectId = user._id;
    const userPrivacySettings = user.privacySettings;


    // Delete from database
    const deleteResult = await db.collection('users').deleteOne({ auth0Id: userData.sub });
    if (deleteResult.deletedCount === 0) {
       // This case should ideally not happen if findOne succeeded, but good practice
      return respondWithCode(404, {
        code: 404,
        message: 'User not found during deletion',
      });
    }

    // Delete from Auth0
    try {
      const managementToken = await getManagementToken();
      await axios.delete(`${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}`, {
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      });
    } catch (error) {
      // Log error but don't fail the request if Auth0 deletion fails
      console.error('Auth0 deletion failed:', error.response?.data || error.message);
    }

    // Clear user-specific caches
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

     // Clear related store preference caches
    if (userPrivacySettings?.optInStores) {
      for (const storeId of userPrivacySettings.optInStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`);
      }
    }


    return respondWithCode(204);
  } catch (error) {
    console.error('Delete profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
