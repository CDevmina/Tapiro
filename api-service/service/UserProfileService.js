const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { getManagementToken } = require('../utils/auth0Util');
const {
  validateCategoryId,
  validateAttributes,
  getCategoryMainType,
} = require('../utils/taxonomyValidator');

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
      return respondWithCode(200, JSON.parse(cachedUser));
    }

    // Get from database
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Cache the result with standardized TTL
    await setCache(cacheKey, JSON.stringify(user), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, user);
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

    // Validate preferences against taxonomy if they're being updated
    if (body.preferences) {
      const normalizedPreferences = [];

      for (const pref of body.preferences) {
        // Validate category exists
        if (!validateCategoryId(pref.category)) {
          return respondWithCode(400, {
            code: 400,
            message: `Invalid category: ${pref.category}`,
          });
        }

        // Normalize category
        const normalizedCategory = getCategoryMainType(pref.category);

        // Validate attributes if present
        if (pref.attributes) {
          const result = validateAttributes(pref.category, pref.attributes);
          if (!result.valid) {
            return respondWithCode(400, {
              code: 400,
              message: result.message,
            });
          }
        }

        // Store with normalized category
        normalizedPreferences.push({
          ...pref,
          category: normalizedCategory,
        });
      }

      // Replace with normalized preferences
      body.preferences = normalizedPreferences;
    }

    // Update user
    const updateData = {
      updatedAt: new Date(),
    };

    // Only add fields that are provided in the request
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.preferences !== undefined) updateData.preferences = body.preferences;
    if (body.privacySettings !== undefined) updateData.privacySettings = body.privacySettings;
    if (body.dataAccess !== undefined) updateData.dataAccess = body.dataAccess;

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: userData.sub },
        { $set: updateData },
        { returnDocument: 'after' },
      );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Invalidate user data cache
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`);

    // Also invalidate preferences cache
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

    // If preferences change might affect store data, invalidate those too:
    if (result.privacySettings?.optInStores) {
      for (const storeId of result.privacySettings.optInStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${result._id}:${storeId}`);
      }
    }

    // Update cache with standardized key and TTL
    const cacheKey = `${CACHE_KEYS.USER_DATA}${userData.sub}`;
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, result);
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

    // Delete from database
    const result = await db.collection('users').deleteOne({ auth0Id: userData.sub });
    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
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
      console.error('Auth0 deletion failed:', error);
    }

    // Clear cache using standardized key
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
