const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
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

    const apiKeyDetailsCacheKey = `${CACHE_KEYS.API_KEY_DETAILS}${apiKey}`; // New cache key
    let cachedApiKeyDetails = await getCache(apiKeyDetailsCacheKey);

    if (cachedApiKeyDetails) {
      cachedApiKeyDetails = JSON.parse(cachedApiKeyDetails);
      if (cachedApiKeyDetails.status === 'active') {
        req.storeId = cachedApiKeyDetails.storeId;
        req.keyId = cachedApiKeyDetails.keyId; // Set keyId for tracking
        trackApiUsage(req, apiKey, req.storeId, req.keyId);
        return true;
      } else {
        // Key was cached but is not active (e.g. revoked)
        throw new Error('API key revoked or invalid');
      }
    }

    // If not in cache or not active, look up in database
    const db = getDB();
    const prefix = apiKey.substring(0, 8);

    const store = await db.collection('stores').findOne({
      'apiKeys.prefix': prefix,
      'apiKeys.status': 'active', // Query for active keys directly
    });

    if (!store) {
      throw new Error('Invalid API key or store not found');
    }

    const foundKey = store.apiKeys.find(
      (key) => key.prefix === prefix && key.status === 'active'
    );

    if (!foundKey) {
      // This case should ideally be covered by the store query if prefix is unique enough
      // and status is checked.
      throw new Error('Invalid API key (specific key not found or inactive)');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    if (keyHash !== foundKey.hashedKey) {
      throw new Error('Invalid API key (hash mismatch)');
    }

    // Set store ID and key ID in request
    req.storeId = store._id.toString();
    req.keyId = foundKey.keyId;

    // Cache the API key details (storeId, keyId, status)
    const apiKeyDetailsToCache = {
      storeId: req.storeId,
      keyId: req.keyId,
      status: foundKey.status, // Should be 'active' here
    };
    await setCache(apiKeyDetailsCacheKey, JSON.stringify(apiKeyDetailsToCache), { EX: CACHE_TTL.API_KEY || 1800 });
    
    trackApiUsage(req, apiKey, req.storeId, req.keyId);
    
    return true;
  } catch (error) {
    console.error('API key validation failed:', error.message); // Log only message for brevity
    // Re-throw to be handled by the oas3-tools error handler or a global error handler
    // which should return a proper HTTP error response.
    // Avoid directly sending res.status here as it bypasses standard error flow.
    throw error; 
  }
};

module.exports = { validateApiKey };