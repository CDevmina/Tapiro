const { auth } = require('express-openid-connect');
const { auth: expressJwtAuth } = require('express-oauth2-jwt-bearer');
const { setCache, getCache } = require('../utils/redisUtil');
const crypto = require('crypto');
const axios = require('axios');

// Generate a secure random string for the secret
const generateSecret = () => crypto.randomBytes(32).toString('hex');

// Auth0 config
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_SPA_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: generateSecret(),
};

// JWT validation middleware - converts to security handler format
const checkJwt = async (req, scopes, schema) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    const jwtValidator = expressJwtAuth({
      audience: process.env.AUTH0_AUDIENCE,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      tokenSigningAlg: 'RS256',
    });

    // Create a promise to handle the middleware validation
    return new Promise((resolve, reject) => {
      jwtValidator(
        req,
        {
          status: () => ({
            json: (data) => reject(new Error(data.message || 'JWT validation failed')),
            end: () => reject(new Error('JWT validation failed')),
          }),
        },
        () => resolve(true),
      );
    });
  } catch (error) {
    console.error('JWT validation failed:', error);
    throw error;
  }
};

// Scope-based access control middleware - converted to security handler format
const checkScope = (requiredScopes) => {
  return async (req, scopes, schema) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }

      // Check Redis cache first
      const cachedScopes = await getCache(`scopes:${token}`);
      if (cachedScopes) {
        const userScopes = JSON.parse(cachedScopes);
        const hasScope = requiredScopes.every((s) => userScopes.includes(s));
        if (!hasScope) {
          throw new Error('Insufficient scopes');
        }
        return true;
      }

      // Verify scopes from Auth0
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      // Get scopes from the token
      const userScopes = (userData.scope || '').split(' ');

      // Cache scopes
      await setCache(`scopes:${token}`, JSON.stringify(userScopes), {
        EX: 3600, // Cache for 1 hour
      });

      const hasScope = requiredScopes.every((s) => userScopes.includes(s));
      if (!hasScope) {
        throw new Error('Insufficient scopes');
      }

      return true;
    } catch (error) {
      console.error('Scope check failed:', error);
      throw error;
    }
  };
};

module.exports = {
  auth: auth(config),
  checkJwt,
  checkScope,
};
