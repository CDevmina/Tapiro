const { auth } = require('express-openid-connect');
const crypto = require('crypto');
const { getUserData, validateUserScopes} = require('../utils/authUtil');

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

/**
 * Extract token from authorization header
 */
const extractToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('No token provided');
  }
  return token;
};

/**
 * Combined token validation and scope checking for OpenAPI security handler
 * This relies on Auth0's /userinfo endpoint for validation
 */
const checkJwtAndScope = async (req, scopes, schema) => {
  try {
    // Extract the token
    const token = extractToken(req);
    
    // Use Auth0 /userinfo endpoint to validate token and get user data
    const userData = await getUserData(token);
    
    // Store user data in request for reuse in controllers
    req.user = userData;
    
    // Validate that the user has required scopes
    await validateUserScopes(token, scopes);
    
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