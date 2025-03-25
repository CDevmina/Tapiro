const axios = require('axios');
const { getCache, setCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

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
    const response = await axios.post(`${AI_SERVICE_URL}/users/data/process`, userData, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('AI service data processing failed:', error?.response?.data || error);
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
