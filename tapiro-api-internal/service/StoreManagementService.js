const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');

/**
 * Create API Key
 * Create a new API key for store
 */
exports.createApiKey = async function (req, body) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Validate API key name
    if (!body.name || body.name.trim() === "") {
      return respondWithCode(400, {
        code: 400,
        message: 'API key name is required.',
      });
    }

    // Check if store exists
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Check if an API key with the same name already exists for this store (and is active)
    if (store.apiKeys && store.apiKeys.some(key => key.name === body.name.trim())) {
      return respondWithCode(409, {
        code: 409,
        message: `An active API key with the name "${body.name.trim()}" already exists.`,
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
      name: body.name.trim(), // Use the provided and trimmed name
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
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

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
    if (!keyToRevoke) {
      return respondWithCode(404, {
        code: 404,
        message: 'API key not found',
      });
    }
    
    // Check if the key is already revoked
    if (keyToRevoke.status === 'revoked') {
      return respondWithCode(400, {
        code: 400,
        message: 'API key is already revoked',
      });
    }
    
    console.log(`Revoking API key with ID: ${keyId}, prefix: ${keyToRevoke.prefix}`);

    // Update API key status to "revoked" instead of removing it
    const result = await db.collection('stores').updateOne(
      { auth0Id: userData.sub, 'apiKeys.keyId': keyId },
      {
        $set: { 
          'apiKeys.$.status': 'revoked',
          updatedAt: new Date() 
        },
      },
    );

    if (result.matchedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found or API key not matched during update',
      });
    }

    // Invalidate store cache to reflect modified API key for the store owner's view
    await invalidateCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);

    // Set a revocation marker for the specific keyId.
    // The external API will check for this marker.
    const markerKey = `revoked_api_key_marker:${keyToRevoke.keyId}`;
    const externalApiKeyCacheTTL = CACHE_TTL.EXTERNAL_API_KEY_DETAILS || 1800; // Use the new constant
    const markerBuffer = 300; // 5 minutes buffer
    const markerTTL = externalApiKeyCacheTTL + markerBuffer; 

    await setCache(markerKey, 'revoked', { EX: markerTTL });
    console.log(`Set revocation marker for keyId ${keyToRevoke.keyId} with TTL ${markerTTL}s. Marker key: ${markerKey}`);
    
    return respondWithCode(204);
  } catch (error) {
    console.error('Revoke API key failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get API Key Usage
 * Get usage statistics for a specific API key
 */
exports.getApiKeyUsage = async function (req, keyId) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Get the store
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }
    
    // Find the API key
    const apiKey = store.apiKeys?.find(k => k.keyId === keyId);
    if (!apiKey) {
      return respondWithCode(404, {
        code: 404,
        message: 'API key not found',
      });
    }

    // Get date parameters from request body instead of query parameters
    const { startDate, endDate } = req.body || {};
    
    // Prepare date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }
    
    // Build the query
    const query = { 
      apiKeyId: keyId,
      storeId: store._id.toString()
    };
    
    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }

    // Get usage data
    const usageData = await db.collection('apiUsage').find(query).toArray();
    
    // Process the data to generate statistics
    const methodBreakdown = {};
    const endpointBreakdown = {};
    const dailyUsage = {};
    
    usageData.forEach(record => {
      // Count methods
      methodBreakdown[record.method] = (methodBreakdown[record.method] || 0) + 1;
      
      // Count endpoints
      endpointBreakdown[record.endpoint] = (endpointBreakdown[record.endpoint] || 0) + 1;
      
      // Group by day for the chart
      const day = record.timestamp.toISOString().split('T')[0];
      dailyUsage[day] = (dailyUsage[day] || 0) + 1;
    });
    
    // Format daily usage for the response
    const dailyUsageArray = Object.entries(dailyUsage).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));

    return respondWithCode(200, {
      keyId: apiKey.keyId,
      prefix: apiKey.prefix,
      name: apiKey.name,
      totalRequests: usageData.length,
      methodBreakdown,
      endpointBreakdown,
      dailyUsage: dailyUsageArray
    });
  } catch (error) {
    console.error('Get API key usage failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get API Usage Log
 * Get paginated detailed usage logs for the store's API keys
 */
exports.getApiUsageLog = async function (req) {
  try {
    const db = getDB();

    // Get user data (store owner)
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Find the store to ensure it exists and get its ID
    const store = await db.collection('stores').findOne(
      { auth0Id: userData.sub },
      { projection: { _id: 1 } } // Only need the store's _id
    );
    if (!store) {
      return respondWithCode(404, { code: 404, message: 'Store not found' });
    }
    const storeId = store._id.toString();

    // Get query parameters
    const { keyId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const skip = (page - 1) * limit;

    // Build the query filter
    const filter = { storeId: storeId }; // Filter by the authenticated store

    if (keyId) {
      // Optional: Validate if keyId belongs to this store?
      // For now, just filter by it if provided.
      filter.apiKeyId = keyId;
    }

    const dateFilter = {};
    if (startDate) {
      try {
        dateFilter.$gte = new Date(startDate);
      } catch (e) {
        return respondWithCode(400, { code: 400, message: 'Invalid startDate format' });
      }
    }
    if (endDate) {
      try {
        // Add 1 day to endDate to make it inclusive of the whole day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateFilter.$lt = end; // Use $lt with the next day
      } catch (e) {
        return respondWithCode(400, { code: 400, message: 'Invalid endDate format' });
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.timestamp = dateFilter;
    }

    // Get total count for pagination
    const totalItems = await db.collection('apiUsage').countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated logs, sorted by timestamp descending
    const logs = await db.collection('apiUsage')
      .find(filter)
      .sort({ timestamp: -1 }) // Show most recent first
      .skip(skip)
      .limit(limit)
      .toArray();

    return respondWithCode(200, {
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
      },
    });

  } catch (error) {
    console.error('Get API usage log failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};