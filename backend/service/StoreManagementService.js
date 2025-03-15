const crypto = require('crypto');
const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { getCache, setCache } = require('../utils/redisUtil');
const axios = require('axios');

/**
 * Generate a new API key for a store
 *
 * @param {Object} req - Request object
 * @returns {Promise<Object>} API key details
 */
exports.createApiKey = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Get store from database
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyId = crypto.randomUUID();
    const prefix = apiKey.substring(0, 8);

    // Hash the API key for storage
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Store the hashed key in the database
    const keyData = {
      keyId,
      prefix,
      hashedKey,
      created: new Date(),
      status: 'active',
    };

    await db
      .collection('stores')
      .updateOne({ auth0Id: userData.sub }, { $push: { apiKeys: keyData } });

    // Invalidate the store cache
    await setCache(`store:${userData.sub}`, '', { EX: 1 });

    // Return the API key (only time it's sent in plaintext)
    return respondWithCode(201, {
      keyId,
      prefix,
      apiKey, // Only returned once at creation
      created: keyData.created,
      status: keyData.status,
    });
  } catch (error) {
    console.error('API key creation failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * List all API keys for a store
 *
 * @param {Object} req - Request object
 * @returns {Promise<Array>} List of API keys
 */
exports.listApiKeys = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Try cache first
    const cachedStore = await getCache(`store:${userData.sub}`);
    let store;

    if (cachedStore) {
      store = JSON.parse(cachedStore);
    } else {
      // Get store from database
      store = await db.collection('stores').findOne({ auth0Id: userData.sub });
      if (store) {
        // Cache the result
        await setCache(`store:${userData.sub}`, JSON.stringify(store), { EX: 3600 });
      }
    }

    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Return API keys (without hashed value)
    const apiKeys = (store.apiKeys || []).map((key) => ({
      keyId: key.keyId,
      prefix: key.prefix,
      created: key.created,
      status: key.status,
    }));

    return respondWithCode(200, apiKeys);
  } catch (error) {
    console.error('List API keys failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Revoke an API key
 *
 * @param {Object} req - Request object
 * @param {string} keyId - ID of key to revoke
 * @returns {Promise<Object>} Empty response with 204 status
 */
exports.revokeApiKey = async function (req, keyId) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Update the API key status to revoked
    const result = await db
      .collection('stores')
      .updateOne(
        { auth0Id: userData.sub, 'apiKeys.keyId': keyId },
        { $set: { 'apiKeys.$.status': 'revoked' } },
      );

    if (result.matchedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'API key not found',
      });
    }

    // Invalidate the store cache
    await setCache(`store:${userData.sub}`, '', { EX: 1 });

    return respondWithCode(204);
  } catch (error) {
    console.error('Revoke API key failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Generate a secure random API key
 *
 * @returns {string} Secure random API key
 */
function generateApiKey() {
  // Generate a securely random 32-byte buffer and encode as base64
  const buffer = crypto.randomBytes(32);
  // Convert to base64 and remove non-alphanumeric characters
  return buffer.toString('base64').replace(/[+/=]/g, '').substring(0, 32);
}
