const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const crypto = require('crypto');
const { ObjectId } = require('mongodb'); // Make sure you have this import

/**
 * Track API key usage
 */
async function trackApiUsage(req, apiKey, storeId, keyId) {
  try {
    // Don't block the response - use a non-awaited operation
    const db = getDB();
    const usageData = {
      storeId,
      apiKeyId: keyId,
      apiKeyPrefix: apiKey.substring(0, 8),
      endpoint: req.originalUrl || req.url,
      method: req.method,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Fire and forget - don't await to avoid slowing down the response
    db.collection('apiUsage').insertOne(usageData)
      .catch(error => console.error('Failed to track API usage:', error));
  } catch (error) {
    // Log but don't throw errors - we don't want tracking failures to break the API
    console.error('Error tracking API usage:', error);
  }
}

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
    const prefix = apiKey.substring(0, 8);
    
    if (cachedStoreId) {
      // Even if we have a cached entry, verify that the key is still active
      const db = getDB();
      const storeWithKey = await db.collection('stores').findOne(
        { 
          _id: new ObjectId(cachedStoreId),
          'apiKeys.prefix': prefix,
          'apiKeys.status': 'active'
        },
        { projection: { 'apiKeys.$': 1 } }
      );
      
      // If key is no longer active, remove from cache and reject
      if (!storeWithKey) {
        console.log(`API key ${prefix} was in cache but is no longer active`);
        await client.del(cacheKey);
        throw new Error('API key revoked or invalid');
      }
      
      // Key is still valid
      req.storeId = cachedStoreId;
      
      // Track API usage - get keyId from found key
      const keyId = storeWithKey.apiKeys[0].keyId;
      trackApiUsage(req, apiKey, cachedStoreId, keyId);
      
      return true;
    }

    // If not in cache, look up in database
    const db = getDB();

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
    await setCache(cacheKey, req.storeId, { EX: CACHE_TTL.API_KEY || 1800 });
    
    // Track API usage
    trackApiUsage(req, apiKey, req.storeId, foundKey.keyId);
    
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    throw error;
  }
};

module.exports = { validateApiKey };