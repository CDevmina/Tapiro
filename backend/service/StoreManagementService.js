const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Create API Key
 * Create a new API key for store
 */
exports.createApiKey = async function (req, body) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Check if store exists
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Generate a new API key
    const apiKeyRaw = crypto.randomBytes(32).toString('hex');
    const prefix = apiKeyRaw.substring(0, 8);
    const hashedKey = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');

    const apiKey = {
      keyId: new ObjectId().toString(),
      prefix,
      hashedKey,
      name: body.name || 'API Key',
      status: 'active',
      createdAt: new Date(),
    };

    // Add key to store
    await db.collection('stores').updateOne(
      { _id: store._id },
      {
        $push: { apiKeys: apiKey },
        $set: { updatedAt: new Date() },
      },
    );

    // Invalidate store cache to reflect new API key
    await invalidateCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);

    return respondWithCode(201, {
      keyId: apiKey.keyId,
      name: apiKey.name,
      prefix: apiKey.prefix,
      apiKey: apiKeyRaw, // Only time the full key is returned
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error('Create API key failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get API Keys
 * Get all API keys for authenticated store
 */
exports.getApiKeys = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Try to get from cache first
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    const cachedStore = await getCache(cacheKey);
    
    if (cachedStore) {
      const store = JSON.parse(cachedStore);
      // Format API keys for response (exclude hash)
      const apiKeys = (store.apiKeys || []).map((key) => ({
        keyId: key.keyId,
        name: key.name,
        prefix: key.prefix,
        status: key.status,
        createdAt: key.createdAt,
      }));
      
      return respondWithCode(200, apiKeys);
    }

    // Get store with API keys from database
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Cache the store data
    await setCache(cacheKey, JSON.stringify(store), { EX: CACHE_TTL.STORE_DATA });

    // Format API keys for response (exclude hash)
    const apiKeys = (store.apiKeys || []).map((key) => ({
      keyId: key.keyId,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      createdAt: key.createdAt,
    }));

    return respondWithCode(200, apiKeys);
  } catch (error) {
    console.error('Get API keys failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete API Key
 * Delete an API key for authenticated store
 */
exports.revokeApiKey = async function (req, keyId) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Get the store with API keys first to find the prefix of the key being revoked
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }
    
    // Find the key to be revoked
    const keyToRevoke = store.apiKeys?.find(k => k.keyId === keyId);

    // Update store to remove API key
    const result = await db.collection('stores').updateOne(
      { auth0Id: userData.sub },
      {
        $pull: { apiKeys: { keyId } },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    if (result.modifiedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'API key not found',
      });
    }

    // Invalidate store cache to reflect deleted API key
    await invalidateCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);
    
    // Also invalidate the API key cache if we found the key
    if (keyToRevoke) {
      await invalidateCache(`${CACHE_KEYS.API_KEY}${keyToRevoke.prefix}`);
    }

    return respondWithCode(204);
  } catch (error) {
    console.error('Delete API key failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};