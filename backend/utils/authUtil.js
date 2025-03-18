const axios = require('axios');
const { setCache, getCache } = require('./redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('./cacheConfig');

/**
 * Role to permission mappings
 */
const ROLE_PERMISSIONS = {
  'user': ['user:read', 'user:write'],
  'store': ['store:read', 'store:write']
};

/**
 * Get user data from Auth0 with caching
 * @param {string} token - Access token
 * @returns {Promise<Object>} - User data from Auth0
 */
async function getUserData(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  // Check cache first
  const cacheKey = `${CACHE_KEYS.USER_DATA}${token}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      // Invalid cache format, continue to API call
    }
  }

  try {
    // Get user data from Auth0
    const { data: userData } = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    // Cache the user data
    await setCache(cacheKey, JSON.stringify(userData), { EX: CACHE_TTL.USER_DATA });
    
    return userData;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw new Error(`Token validation failed: ${message}`);
  }
}

/**
 * Get user scopes based on their roles and directly assigned scopes
 * @param {string} token - Access token
 * @param {Array<string>} requiredScopes - Required scopes for this endpoint
 * @returns {Promise<boolean>} - True if user has all required scopes
 */
async function validateUserScopes(token, requiredScopes) {
  if (!requiredScopes || requiredScopes.length === 0) {
    return true;
  }

  const scopesKey = `${CACHE_KEYS.SCOPES}${token}`;
  
  // Check cache first
  const cachedScopes = await getCache(scopesKey);
  if (cachedScopes) {
    try {
      const userScopes = JSON.parse(cachedScopes);
      if (Array.isArray(userScopes) && userScopes.length > 0) {
        // Check if user has all required scopes
        const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));
        if (hasAllScopes) return true;
        throw new Error(`Insufficient scopes. Required: ${requiredScopes.join(', ')}. Available: ${userScopes.join(', ')}`);
      }
    } catch (e) {
      // Invalid cache format, continue to calculation
    }
  }

  // Get user data to extract roles
  const userData = await getUserData(token);
  const userRoles = userData['https://tapiro.com/roles'] || [];
  
  // Calculate all user scopes
  const userScopes = [
    // Add scopes from roles
    ...userRoles.flatMap(role => ROLE_PERMISSIONS[role] || []),
    // Add direct scopes if available
    ...(userData.scope ? userData.scope.split(' ') : [])
  ];
  
  // Remove duplicates
  const uniqueScopes = [...new Set(userScopes)];
  
  // Cache scopes for future requests
  await setCache(scopesKey, JSON.stringify(uniqueScopes), { EX: CACHE_TTL.TOKEN });
  
  // Check if user has all required scopes
  const hasAllScopes = requiredScopes.every(scope => uniqueScopes.includes(scope));
  if (!hasAllScopes) {
    throw new Error(`Insufficient scopes. Required: ${requiredScopes.join(', ')}. Available: ${uniqueScopes.join(', ')}`);
  }
  
  return true;
}

module.exports = {
  getUserData,
  validateUserScopes,
  ROLE_PERMISSIONS
};