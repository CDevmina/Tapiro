const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { updateUserMetadata, updateUserPhone, deleteAuth0User } = require('../utils/auth0Util');

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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const auth0UserId = userData.sub;

    // --- Username Uniqueness Check ---
    if (body.username && body.username !== userData.nickname) { // Check only if username changed
      const existingUser = await db.collection('users').findOne({
        username: body.username,
        auth0Id: { $ne: auth0UserId },
      });
      if (existingUser) {
        return respondWithCode(409, { code: 409, message: 'Username already taken' });
      }
      // Also update Auth0 nickname if username changes
      try {
        // Pass invalidateUserCache: true if you want the main user cache invalidated here
        await updateUserMetadata(auth0UserId, { nickname: body.username } /*, true */);
      } catch (auth0Error) {
        console.error(`Failed to update Auth0 nickname for ${auth0UserId}:`, auth0Error);
        // Log and continue DB update
      }
    }

    // --- Phone Number Update in Auth0 ---
    if (body.phone && body.phone !== userData.phone_number) { // Check only if phone changed
      try {
        // Call the utility function
        await updateUserPhone(auth0UserId, body.phone);
        // Optionally invalidate user cache here if phone update should trigger it
        // await invalidateCache(`${CACHE_KEYS.USER_DATA}${auth0UserId}`);
      } catch (auth0Error) {
        // Error is already logged in updateUserPhone
        // Decide if this should be a fatal error or just logged
        // For now, log and continue DB update
        // Consider returning a specific error if Auth0 update is critical
        // return respondWithCode(500, { code: 500, message: 'Failed to update phone number with identity provider.' });
      }
    }

    // --- Database Update ---
    const updateData = {
      updatedAt: new Date(),
    };
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // Only update allowed privacy settings
    if (body.privacySettings !== undefined) {
      updateData.privacySettings = {};
      if (body.privacySettings.dataSharingConsent !== undefined) {
        updateData.privacySettings.dataSharingConsent = body.privacySettings.dataSharingConsent;
      }
      if (body.privacySettings.anonymizeData !== undefined) {
        updateData.privacySettings.anonymizeData = body.privacySettings.anonymizeData;
      }
      // DO NOT update optInStores or optOutStores here
    }

    if (body.dataAccess !== undefined) updateData.dataAccess = body.dataAccess;

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: auth0UserId },
        { $set: updateData },
        { returnDocument: 'after', projection: { preferences: 0 } },
      );

    if (!result) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // --- Cache Invalidation ---
    // Invalidate main user cache *after* successful DB update
    const cacheKey = `${CACHE_KEYS.USER_DATA}${auth0UserId}`;
    await invalidateCache(cacheKey);

    // Invalidate store preferences if privacy settings changed
    if (updateData.privacySettings && result.privacySettings?.optInStores) {
       const userObjectId = result._id;
       for (const storeId of result.privacySettings.optInStores) {
         await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`);
       }
    }

    // --- Update Cache ---
    // Update cache with the new data (without preferences)
    // Note: This happens *after* invalidation, ensuring fresh data is set if needed immediately
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update profile failed:', error);
    // Check if the error came from Auth0 phone update and customize response if needed
    // if (error.message.includes('Auth0 phone number')) { ... }
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

    // Delete from Auth0 using the utility function
    await deleteAuth0User(userData.sub); // Call the new function

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
