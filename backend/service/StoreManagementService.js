const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache } = require('../utils/redisUtil');
const { getUserData } = require('../utils/authUtil');
const { CACHE_KEYS } = require('../utils/cacheConfig');

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

    // Clear store cache to reflect new API key
    await setCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`, '', { EX: 1 });

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

    // Get store with API keys
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

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
exports.deleteApiKey = async function (req, keyId) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

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

    // Clear store cache to reflect deleted API key
    await setCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`, '', { EX: 1 });

    return respondWithCode(204);
  } catch (error) {
    console.error('Delete API key failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
