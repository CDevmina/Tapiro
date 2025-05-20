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

    const apiKeyDetailsCacheKey = `${CACHE_KEYS.API_KEY_DETAILS}${apiKey}`; 
    let cachedApiKeyDetails = await getCache(apiKeyDetailsCacheKey);

    if (cachedApiKeyDetails) {
      cachedApiKeyDetails = JSON.parse(cachedApiKeyDetails);
      const { keyId: cachedKeyId, storeId: cachedStoreId, status: cachedStatus } = cachedApiKeyDetails;

      if (cachedStatus === 'active') {
        // Check for an explicit revocation marker for this keyId
        let isMarkedRevoked = false;
        if (cachedKeyId) {
          const markerKey = `revoked_api_key_marker:${cachedKeyId}`;
          const revocationMarker = await getCache(markerKey);
          if (revocationMarker === 'revoked') {
            isMarkedRevoked = true;
          }
        }

        if (isMarkedRevoked) {
          console.log(`API key ${apiKey.substring(0,8)}... (keyId: ${cachedKeyId}) found revocation marker. Invalidating local cache.`);
          await invalidateCache(apiKeyDetailsCacheKey); // Invalidate this specific raw API key's cache
          throw new Error('API key revoked or invalid (marker)');
        }

        // If not marked revoked, proceed
        req.storeId = cachedStoreId;
        req.keyId = cachedKeyId; 
        trackApiUsage(req, apiKey, req.storeId, req.keyId);
        return true;
      } else {
        // Key was cached but is not active (e.g. revoked directly in this cache)
        throw new Error('API key revoked or invalid (cached as non-active)');
      }
    }

    // If not in cache or not active, look up in database
    const db = getDB();
    const prefix = apiKey.substring(0, 8);

    const store = await db.collection('stores').findOne({
      'apiKeys.prefix': prefix,
      'apiKeys.status': 'active', 
    });

    if (!store) {
      throw new Error('Invalid API key or store not found');
    }

    const foundKey = store.apiKeys.find(
      (key) => key.prefix === prefix && key.status === 'active'
    );

    if (!foundKey) {
      throw new Error('Invalid API key (specific key not found or inactive)');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    if (keyHash !== foundKey.hashedKey) {
      throw new Error('Invalid API key (hash mismatch)');
    }

    req.storeId = store._id.toString();
    req.keyId = foundKey.keyId;

    const apiKeyDetailsToCache = {
      storeId: req.storeId,
      keyId: req.keyId,
      status: foundKey.status, 
    };
    // Use the correct TTL from local cacheConfig for API_KEY_DETAILS
    await setCache(apiKeyDetailsCacheKey, JSON.stringify(apiKeyDetailsToCache), { EX: CACHE_TTL.API_KEY_DETAILS || 1800 });
    
    trackApiUsage(req, apiKey, req.storeId, req.keyId);
    
    return true;
  } catch (error) {
    console.error('API key validation failed:', error.message); 
    throw error; 
  }
};

module.exports = { validateApiKey };