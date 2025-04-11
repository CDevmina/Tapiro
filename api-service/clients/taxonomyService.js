const axios = require('axios');
const { getCache, setCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

// Axios Instance
const axiosInstance = axios.create();

// Get environment variables - use config fallback for backward compatibility
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

// Add these constants at the top of taxonomyService.js
const REQUEST_TIMEOUTS = {
  DEFAULT: 5000, // Standard endpoints
  SHORT: 2000, // Health checks
  LONG: 10000, // Complex operations
};

/**
 * Check taxonomy service health
 * @returns {Promise<Object>} Health status
 */
exports.checkHealth = async function () {
  try {
    const response = await axiosInstance.get(`${AI_SERVICE_URL}/taxonomy/health`, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
      },
      timeout: REQUEST_TIMEOUTS.SHORT,
    });
    return { status: 'connected', details: response.data };
  } catch (error) {
    console.error('Health check failed:', error?.response?.data || error);
    return { status: 'disconnected', details: error.message };
  }
};

/**
 * Get MongoDB schema properties for taxonomy attributes
 * @returns {Promise<Object>} Schema properties for MongoDB
 */
exports.getMongoDBSchemas = async function () {
  try {
    const cacheKey = `${CACHE_KEYS.SCHEMA_PROPS}mongodb`;

    // Try Redis cache
    const cachedSchemas = await getCache(cacheKey);
    if (cachedSchemas) {
      return JSON.parse(cachedSchemas);
    }

    const response = await axiosInstance.get(`${AI_SERVICE_URL}/taxonomy/schemas/mongodb`, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: REQUEST_TIMEOUTS.DEFAULT,
    });

    // Cache in Redis
    await setCache(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL.SCHEMA });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch MongoDB schemas:', error?.response?.data || error);
    throw error;
  }
};
