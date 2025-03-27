const axios = require('axios');
const { getCache, setCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

// Axios Instance
const axiosInstance = axios.create();

// Get environment variables
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

/**
 * Process user data by sending it to AI service
 * @param {Object} userData - The user data to process
 * @returns {Promise<Object>} - Processing status
 */
exports.processUserData = async function (userData) {
  try {
    // Create a more deterministic cache key with relevant fields only
    const keyData = {
      email: userData.email,
      data_type: userData.data_type,
      userId: userData.metadata?.userId,
    };
    const cacheKey = `${CACHE_KEYS.AI_REQUEST}${JSON.stringify(keyData)}`;
    const cachedResponse = await getCache(cacheKey);

    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }

    const response = await axiosInstance.post(`${AI_SERVICE_URL}/users/data/process`, userData, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Use the standard TTL constant
    await setCache(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL.AI_REQUEST });

    return response.data;
  } catch (error) {
    console.error('AI service data processing failed:', error?.response?.data || error);

    // More specific error handling
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('AI service authentication failed');
      } else if (error.response.status === 404) {
        throw new Error('User not found in AI service');
      } else if (error.response.status >= 500) {
        throw new Error('AI service internal error');
      }
    } else if (error.request) {
      throw new Error('AI service connection failed');
    }

    throw error;
  }
};

/**
 * Check AI service health
 * @returns {Promise<Object>} - Health status
 */
exports.checkHealth = async function () {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
      },
    });
    return { status: 'connected', details: response.data };
  } catch (error) {
    return { status: 'disconnected', details: error.message };
  }
};
