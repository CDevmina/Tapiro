const crypto = require('crypto');
const { getDB } = require('../utils/mongoUtil'); // #attachment:api-service/utils/mongoUtil.js
const { ObjectId } = require('mongodb'); // Ensure ObjectId is imported

// Middleware function registered as the 'apiKey' security handler
// Signature matches oas3-tools expectation: (req, scopes, schema)
async function apiKeyAuth(req, scopes, schema) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    // Throw error instead of sending response
    throw new Error('API key required');
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
      // Throw error instead of sending response
      throw new Error('Invalid or inactive API key');
    }

    // Find the specific key details
    const activeKey = store.apiKeys.find(k => k.prefix === prefix && k.hashedKey === hashedKey && k.status === 'active');

    if (!activeKey) {
        // This case should theoretically not happen if the store was found, but good for safety
        console.warn(`API key auth failed: Key details mismatch for prefix ${prefix} in store ${store._id}`);
        // Throw error instead of sending response
        throw new Error('Invalid or inactive API key details');
    }


    // Attach storeId and key details to the request object for downstream use
    req.storeId = store._id.toString(); // Use string representation of ObjectId
    req.apiKeyId = activeKey.keyId; // Attach keyId (already a string)
    req.apiKeyPrefix = activeKey.prefix; // Attach prefix

    // Return true on success as expected by oas3-tools
    return true;

  } catch (error) {
    // Log the specific error during validation
    // Use the existing error message or create a generic one
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during API key validation';
    console.error('API key authentication error:', errorMessage);
    // Re-throw the error so oas3-tools handles it as an authentication failure
    // It will typically result in a 401 or 500 response automatically based on the error type
    throw new Error(errorMessage); // Throw a new error with the message
  }
}

module.exports = apiKeyAuth; // Export the handler function directly