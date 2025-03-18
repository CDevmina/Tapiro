const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const crypto = require('crypto');

/**
 * Middleware to validate API keys for store endpoints
 * Returns true if valid, throws error if invalid
 */
const validateApiKey = async (req, scopes, schema) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      throw new Error('API key required');
    }

    // Try to get store ID from cache first
    const cacheKey = `${CACHE_KEYS.API_KEY}${apiKey}`;
    const cachedStoreId = await getCache(cacheKey);
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
      throw new Error('Invalid API key');
    }

    // Find the specific API key
    const foundKey = store.apiKeys.find((key) => key.prefix === prefix && key.status === 'active');

    if (!foundKey) {
      throw new Error('Invalid API key');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Check if the hash matches
    if (keyHash !== foundKey.hashedKey) {
      throw new Error('Invalid API key');
    }

    // Set store ID in request and cache the mapping
    req.storeId = store._id.toString();
    await setCache(cacheKey, req.storeId, { EX: CACHE_TTL.TOKEN });
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    throw error;
  }
};

module.exports = { validateApiKey };