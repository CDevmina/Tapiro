const axios = require('axios');
const { getCache, setCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

// Axios Instance
const axiosInstance = axios.create();

// Get environment variables - use config fallback for backward compatibility
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || require('../config').mlService.baseUrl;
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY || require('../config').mlService.apiKey;

/**
 * Get the full taxonomy tree
 * @returns {Promise<Object>} Taxonomy tree
 */
exports.getTaxonomyTree = async function () {
  try {
    const cacheKey = `${CACHE_KEYS.TAXONOMY_TREE}`;

    // Try Redis cache
    const cachedTree = await getCache(cacheKey);
    if (cachedTree) {
      return JSON.parse(cachedTree);
    }

    // Fetch from ML service
    const response = await axiosInstance.get(`${ML_SERVICE_URL}/taxonomy/tree`, {
      headers: {
        'X-API-Key': ML_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 5000, // 5 second timeout for taxonomy
    });

    // Cache in Redis
    await setCache(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL.TAXONOMY });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch taxonomy tree:', error?.response?.data || error);

    // Standardized error handling
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('ML service authentication failed');
      } else if (error.response.status === 404) {
        throw new Error('Taxonomy tree not found');
      } else if (error.response.status >= 500) {
        throw new Error('ML service internal error');
      }
    } else if (error.request) {
      throw new Error('ML service connection failed');
    }

    throw error;
  }
};

/**
 * Get attributes for a specific category
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category attributes
 */
exports.getCategoryAttributes = async function (categoryId) {
  try {
    const cacheKey = `${CACHE_KEYS.TAXONOMY_ATTRIBUTES}:${categoryId}`;

    // Try Redis cache
    const cachedAttrs = await getCache(cacheKey);
    if (cachedAttrs) {
      return JSON.parse(cachedAttrs);
    }

    // Fetch from ML service
    const response = await axiosInstance.get(
      `${ML_SERVICE_URL}/taxonomy/attributes/${categoryId}`,
      {
        headers: {
          'X-API-Key': ML_SERVICE_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 3000,
      },
    );

    // Cache in Redis
    await setCache(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL.TAXONOMY_ATTRIBUTES });

    return response.data;
  } catch (error) {
    console.error(
      `Failed to fetch attributes for category ${categoryId}:`,
      error?.response?.data || error,
    );

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('ML service authentication failed');
      } else if (error.response.status === 404) {
        return null; // Category not found, return null for cleaner handling
      } else if (error.response.status >= 500) {
        throw new Error('ML service internal error');
      }
    } else if (error.request) {
      throw new Error('ML service connection failed');
    }

    throw error;
  }
};

/**
 * Validate product attributes for a category
 * @param {string} categoryId - Category ID
 * @param {Object} attributes - Product attributes
 * @returns {Promise<Object>} Validation result
 */
exports.validateAttributes = async function (categoryId, attributes) {
  try {
    const response = await axiosInstance.post(
      `${ML_SERVICE_URL}/taxonomy/validate`,
      {
        category: categoryId,
        attributes,
      },
      {
        headers: {
          'X-API-Key': ML_SERVICE_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 3000,
      },
    );

    return response.data;
  } catch (error) {
    console.error('Failed to validate attributes:', error?.response?.data || error);

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('ML service authentication failed');
      } else if (error.response.status === 404) {
        return { valid: false, message: 'Category not found' };
      } else if (error.response.status >= 500) {
        return { valid: false, message: 'Validation service error' };
      }
    } else if (error.request) {
      return { valid: false, message: 'Validation service unavailable' };
    }

    return { valid: false, message: 'Validation failed' };
  }
};

/**
 * Find category based on text description
 * @param {string} text - Product description text
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Matching categories
 */
exports.findCategoryByText = async function (text, limit = 5) {
  try {
    // Using a cache key based on the query text
    const cacheKey = `${CACHE_KEYS.TAXONOMY_SEARCH}:${text}:${limit}`;

    // Try Redis cache
    const cachedResults = await getCache(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }

    const response = await axiosInstance.get(`${ML_SERVICE_URL}/taxonomy/search`, {
      params: { query: text, limit },
      headers: {
        'X-API-Key': ML_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    // Cache search results (short TTL as search patterns may change)
    await setCache(cacheKey, JSON.stringify(response.data), {
      EX: CACHE_TTL.TAXONOMY_SEARCH || 300,
    });

    return response.data;
  } catch (error) {
    console.error('Failed to search categories:', error?.response?.data || error);

    // Return empty array on error for graceful failure
    return [];
  }
};

/**
 * Get price ranges for all categories
 * @returns {Promise<Object>} Price ranges by category
 */
exports.getPriceRanges = async function () {
  try {
    const cacheKey = `${CACHE_KEYS.PRICE_RANGES}`;

    // Try Redis cache
    const cachedRanges = await getCache(cacheKey);
    if (cachedRanges) {
      return JSON.parse(cachedRanges);
    }

    const response = await axiosInstance.get(`${ML_SERVICE_URL}/taxonomy/price-ranges`, {
      headers: {
        'X-API-Key': ML_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    });

    // Cache in Redis
    await setCache(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL.TAXONOMY });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch price ranges:', error?.response?.data || error);

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('ML service authentication failed');
      } else if (error.response.status >= 500) {
        throw new Error('ML service internal error');
      }
    } else if (error.request) {
      throw new Error('ML service connection failed');
    }

    throw error;
  }
};

/**
 * Check taxonomy service health
 * @returns {Promise<Object>} Health status
 */
exports.checkHealth = async function () {
  try {
    const response = await axiosInstance.get(`${ML_SERVICE_URL}/taxonomy/health`, {
      headers: {
        'X-API-Key': ML_SERVICE_API_KEY,
      },
      timeout: 2000,
    });
    return { status: 'connected', details: response.data };
  } catch (error) {
    console.error('Health check failed:', error?.response?.data || error);
    return { status: 'disconnected', details: error.message };
  }
};
