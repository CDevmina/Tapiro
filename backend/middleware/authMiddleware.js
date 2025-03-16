const { auth } = require('express-openid-connect');
const { auth: expressJwtAuth } = require('express-oauth2-jwt-bearer');
const { setCache, getCache } = require('../utils/redisUtil');
const crypto = require('crypto');

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

// JWT validation middleware
const checkJwt = expressJwtAuth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
});

// Scope-based access control middleware
const checkScope = (requiredScopes) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Check Redis cache first
      const cachedScopes = await getCache(`scopes:${token}`);
      if (cachedScopes) {
        const scopes = JSON.parse(cachedScopes);
        const hasScope = requiredScopes.every((s) => scopes.includes(s));
        if (!hasScope) {
          return res.status(403).json({ message: 'Insufficient scopes' });
        }
        return next();
      }

      // Verify scopes from Auth0
      const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await response.json();

      // Get scopes from the token
      // Auth0 typically includes scopes in the 'scope' property or sometimes in 'permissions'
      const userScopes = (userData.scope || '').split(' ');

      // Cache scopes
      await setCache(`scopes:${token}`, JSON.stringify(userScopes), {
        EX: 3600, // Cache for 1 hour
      });

      const hasScope = requiredScopes.every((s) => userScopes.includes(s));
      if (!hasScope) {
        return res.status(403).json({ message: 'Insufficient scopes' });
      }

      next();
    } catch (error) {
      console.error('Scope check failed:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = {
  auth: auth(config),
  checkJwt,
  checkScope,
};
