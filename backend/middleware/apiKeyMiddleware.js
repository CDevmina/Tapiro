const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache } = require('../utils/redisUtil');

/**
 * Middleware to validate API keys for store endpoints
 */
const validateApiKey = async (req) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return false;
    }

    // Try to get store ID from cache first
    const cachedStoreId = await getCache(`apikey:${apiKey}`);
    if (cachedStoreId) {
      req.storeId = cachedStoreId;
      return true;
    }

    // If not in cache, look up in database
    const db = getDB();
    const prefix = apiKey.substring(0, 8);

    // Find store with matching API key prefix
    const store = await db.collection('stores').findOne({
      'apiKeys.prefix': prefix,
      'apiKeys.status': 'active',
    });

    if (!store) {
      return false;
    }

    // Find the specific API key
    const foundKey = store.apiKeys.find((key) => key.prefix === prefix && key.status === 'active');

    if (!foundKey) {
      return false;
    }

    // Set store ID in request and cache the mapping
    req.storeId = store._id.toString();
    await setCache(`apikey:${apiKey}`, req.storeId, { EX: 3600 }); // Cache for 1 hour
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
};

module.exports = { validateApiKey };
