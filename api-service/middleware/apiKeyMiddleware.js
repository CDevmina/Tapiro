const crypto = require('crypto');
const { getDB } = require('../utils/mongoUtil');

async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ code: 401, message: 'API key required' });
  }

  try {
    const db = getDB();
    const prefix = apiKey.substring(0, 8);
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find store by API key prefix and hashed key
    const store = await db.collection('stores').findOne({
      'apiKeys.prefix': prefix,
      'apiKeys.hashedKey': hashedKey,
      'apiKeys.status': 'active', // Ensure key is active
    });

    if (!store) {
      // Log the prefix for debugging, but don't expose hash or full key
      console.warn(`API key auth failed: No active key found for prefix ${prefix}`);
      return res.status(401).json({ code: 401, message: 'Invalid or inactive API key' });
    }

    // Find the specific key details
    const activeKey = store.apiKeys.find(k => k.prefix === prefix && k.hashedKey === hashedKey && k.status === 'active');

    if (!activeKey) {
        // This case should theoretically not happen if the store was found, but good for safety
        console.warn(`API key auth failed: Key details mismatch for prefix ${prefix} in store ${store._id}`);
        return res.status(401).json({ code: 401, message: 'Invalid or inactive API key details' });
    }


    // Attach storeId and key details to the request object for downstream use
    req.storeId = store._id.toString(); // Use string representation of ObjectId
    req.apiKeyId = activeKey.keyId; // Attach keyId (already a string)
    req.apiKeyPrefix = activeKey.prefix; // Attach prefix

    // Removed tracking from middleware - moved to services where more context is available
    // trackApiUsage(req, apiKey, req.storeId, activeKey.keyId);

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ code: 500, message: 'Internal server error during API key validation' });
  }
}

module.exports = apiKeyAuth;