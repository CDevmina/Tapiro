const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { deleteAuth0User } = require('../utils/auth0Util');
const { ObjectId } = require('mongodb'); // Import ObjectId

/**
 * Get Store Profile
 * Get authenticated store's profile
 */
exports.getStoreProfile = async function (req) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Update store
    const updateData = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.webhooks !== undefined) updateData.webhooks = body.webhooks;

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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Delete from database
    const result = await db.collection('stores').deleteOne({ auth0Id: userData.sub });
    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Delete from Auth0 using the utility function
    await deleteAuth0User(userData.sub); // Call the new function

    // Clear cache using standardized key
    await invalidateCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Lookup Store Details
 * Retrieves basic details (like name) for a list of store IDs.
 */
exports.lookupStores = async function (req, ids) {
  try {
    if (!ids) {
      return respondWithCode(400, { code: 400, message: 'Missing required query parameter: ids' });
    }

    const storeIds = ids.split(',');

    // Optional: Validate if IDs are in ObjectId format if needed
    // const validObjectIds = storeIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    // if (validObjectIds.length !== storeIds.length) {
    //   return respondWithCode(400, { code: 400, message: 'One or more invalid store ID formats provided.' });
    // }

    const db = getDB();

    const stores = await db.collection('stores')
      .find({ _id: { $in: storeIds.map(id => new ObjectId(id)) } }) // Use ObjectId for lookup if IDs are ObjectIds
      // If store IDs are stored as strings in optIn/optOut lists, use:
      // .find({ _id: { $in: storeIds } })
      .project({ _id: 1, name: 1 }) // Project only ID and name
      .toArray();

    // Format the response to match StoreBasicInfo schema
    const formattedStores = stores.map(store => ({
      storeId: store._id.toString(), // Convert ObjectId back to string
      name: store.name
    }));

    // Caching could be considered if lookups for the same set of IDs are common,
    // but the cache key generation might be complex.

    return respondWithCode(200, formattedStores);

  } catch (error) {
    console.error('Lookup stores failed:', error);
    // Handle potential ObjectId format errors if validation is strict
    if (error.message.includes('Argument passed in must be a single String')) {
       return respondWithCode(400, { code: 400, message: 'Invalid store ID format provided.' });
    }
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * List or Search Stores (for User Discovery)
 * Retrieves a paginated list of stores, optionally filtered by name.
 */
exports.listStoresForUserDiscovery = async function (req, search, limit = 20, page = 1) {
  try {
    const db = getDB();
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      // Use a case-insensitive regex search on the store name
      query.name = { $regex: search, $options: 'i' };
    }

    // Ensure limit is a number
    const numericLimit = parseInt(limit, 10);
    if (isNaN(numericLimit) || numericLimit <= 0) {
        numericLimit = 20; // Default if invalid
    }


    // Find stores matching the query, projecting only necessary fields
    const storesCursor = db.collection('stores').find(query, {
      projection: { _id: 1, name: 1 }, // Only need ID and name
    });

    // Get total count for pagination before applying skip/limit
    const totalStores = await storesCursor.count(); // Use count() on the cursor before skip/limit

    // Apply sorting, skip, and limit
    const stores = await storesCursor
      .sort({ name: 1 }) // Sort alphabetically by name
      .skip(skip)
      .limit(numericLimit)
      .toArray();

    // Format the response
    const formattedStores = stores.map(store => ({
      storeId: store._id.toString(),
      name: store.name,
    }));

    const totalPages = Math.ceil(totalStores / numericLimit);

    const responsePayload = {
      stores: formattedStores,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalStores: totalStores,
      },
    };

    // Caching could be added here if needed, consider search/page/limit in key
    // const cacheKey = `${CACHE_KEYS.STORES_LIST}:${search || 'all'}:${page}:${limit}`;
    // await setCache(cacheKey, JSON.stringify(responsePayload), { EX: CACHE_TTL.SHORT });

    return respondWithCode(200, responsePayload);

  } catch (error) {
    console.error('List stores for user discovery failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
