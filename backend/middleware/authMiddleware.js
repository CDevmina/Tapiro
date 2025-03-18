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

const ROLE_PERMISSIONS = {
  'user': ['user:read', 'user:write'],
  'store': ['store:read', 'store:write']
};

// JWT validation middleware that returns the validated token
const checkJwt = async (req) => {
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
  await new Promise((resolve, reject) => {
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
  
  return token;
};

// Combined JWT and scope validation for OpenAPI security handler
const checkJwtAndScope = async (req, scopes, schema) => {
  try {
    // First validate the JWT token and reuse the extracted token
    const token = await checkJwt(req);
    
    // Check Redis cache first
    const cachedScopes = await getCache(`scopes:${token}`);
    
    // Process cached scopes if valid
    if (cachedScopes && cachedScopes !== '[]' && cachedScopes !== '[""]') {
      try {
        const userScopes = JSON.parse(cachedScopes);
        if (Array.isArray(userScopes) && userScopes.length > 0 && userScopes[0] !== '') {
          // Check if user has all required scopes
          const hasAllScopes = scopes.every(scope => userScopes.includes(scope));
          if (hasAllScopes) return true;
          throw new Error(`Insufficient scopes. Required: ${scopes.join(', ')}. Available: ${userScopes.join(', ')}`);
        }
      } catch (e) {
        // Invalid cache format, continue to Auth0 verification
      }
    }

    // Verify scopes from Auth0
    const { data: userData } = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    const userRoles = userData['https://tapiro.com/roles'] || [];
    
    // Build scopes array efficiently
    const userScopes = [
      // Add scopes from roles
      ...userRoles.flatMap(role => ROLE_PERMISSIONS[role] || []),
      // Add direct scopes if available
      ...(userData.scope ? userData.scope.split(' ') : [])
    ];
    
    // Remove duplicates with Set
    const uniqueScopes = [...new Set(userScopes)];
    
    // Cache scopes for future requests
    await setCache(`scopes:${token}`, JSON.stringify(uniqueScopes), { EX: 3600 });
    
    // Check if user has all required scopes
    const hasAllScopes = scopes.every(scope => uniqueScopes.includes(scope));
    if (!hasAllScopes) {
      throw new Error(`Insufficient scopes. Required: ${scopes.join(', ')}. Available: ${uniqueScopes.join(', ')}`);
    }

    return true;
  } catch (error) {
    console.error('Authorization check failed:', error.message);
    throw error;
  }
};

module.exports = {
  auth: auth(config),
  checkJwtAndScope
};