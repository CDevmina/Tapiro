const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Get Store Profile
 * Get authenticated store's profile
 */
exports.getStoreProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Try cache first using standardized cache key
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    const cachedStore = await getCache(cacheKey);
    if (cachedStore) {
      return respondWithCode(200, JSON.parse(cachedStore));
    }

    // Get from database
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Cache the result with standardized TTL
    await setCache(cacheKey, JSON.stringify(store), { EX: CACHE_TTL.STORE_DATA });
    return respondWithCode(200, store);
  } catch (error) {
    console.error('Get store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update Store Profile
 * Update authenticated store's profile
 */
exports.updateStoreProfile = async function (req, body) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Update store
    const { name, address, webhooks } = body;
    const updateData = {
      name,
      address,
      webhooks,
      updatedAt: new Date(),
    };

    const result = await db
      .collection('stores')
      .findOneAndUpdate(
        { auth0Id: userData.sub },
        { $set: updateData },
        { returnDocument: 'after' },
      );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Update cache with standardized key and TTL
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.STORE_DATA });
    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete Store Profile
 * Delete authenticated store's profile
 */
exports.deleteStoreProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Delete from database
    const result = await db.collection('stores').deleteOne({ auth0Id: userData.sub });
    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
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
    await invalidateCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};