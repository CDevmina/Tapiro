require('dotenv').config();
const { auth } = require('express-openid-connect');
const { getCache } = require('../utils/redisUtil');
const { ApiError } = require('../utils/errorUtil');

// Auth0 config
const config = {
  authRequired: true,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_CLIENT_SECRET,
};

/**
 * Token validation middleware for OpenAPI security
 * @param {Object} req - Express request object
 * @param {Object} scopes - Required OAuth2 scopes
 * @returns {Promise<boolean>} - Returns true if validation succeeds
 * @throws {ApiError} - Throws API error if validation fails
 */
const validateToken = async (req, scopes) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw ApiError.Unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.Unauthorized('Invalid authorization header format');
    }

    // Check Redis cache
    const cachedToken = await getCache(`token:${token}`);
    if (!cachedToken) {
      throw ApiError.Unauthorized('Invalid or expired token');
    }

    // Parse user info and validate scopes
    const userInfo = JSON.parse(cachedToken);
    req.user = userInfo;

    // Validate required scopes if specified
    if (scopes && scopes.length > 0) {
      const userScopes = userInfo.scope ? userInfo.scope.split(' ') : [];
      const hasRequiredScopes = scopes.every(scope => userScopes.includes(scope));
      
      if (!hasRequiredScopes) {
        throw ApiError.Forbidden('Insufficient permissions');
      }
    }

    return true;

  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error.code) {
      // If it's our API error, rethrow it
      throw error;
    }
    // For unexpected errors, throw internal server error
    throw ApiError.InternalError('Token validation failed', error);
  }
};

module.exports = { auth: auth(config), validateToken };
