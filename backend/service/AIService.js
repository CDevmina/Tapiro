const axios = require('axios');
const { setCache, getCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

/**
 * Process user data through AI service
 * @param {Object} userData - User data to process
 * @returns {Promise<Object>} - Processing result or status
 */
exports.processUserData = async function (userData) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/users/data/process`, userData, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('AI service processing failed:', error?.response?.data || error);
    throw error;
  }
};

/**
 * Get user preferences from AI service
 * @param {string} userId - User ID to get preferences for
 * @returns {Promise<Object>} - User preferences
 */
exports.getUserPreferences = async function (userId) {
  // Try cache first
  const cacheKey = `${CACHE_KEYS.AI_PREFERENCES}${userId}`;
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/users/${userId}/preferences`, {
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
      },
    });

    // Cache the result
    await setCache(cacheKey, JSON.stringify(response.data), {
      EX: CACHE_TTL.AI_PREFERENCES || 3600,
    });

    return response.data;
  } catch (error) {
    console.error('AI service preferences fetch failed:', error?.response?.data || error);
    throw error;
  }
};
