const { auth } = require('express-openid-connect');
const { auth: expressJwtAuth } = require('express-oauth2-jwt-bearer');
const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache } = require('../utils/redisUtil');

// Auth0 config
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_CLIENT_SECRET,
};

// JWT validation middleware
const checkJwt = expressJwtAuth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
});

// Role-based access control middleware
const checkRole = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Check Redis cache first
      const cachedPermissions = await getCache(`permissions:${token}`);
      if (cachedPermissions) {
        const permissions = JSON.parse(cachedPermissions);
        const hasPermission = requiredPermissions.every((p) => permissions.includes(p));
        if (!hasPermission) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        return next();
      }

      // Verify permissions from Auth0
      const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await response.json();

      // Cache permissions
      await setCache(`permissions:${token}`, JSON.stringify(userData.permissions), {
        EX: 3600, // Cache for 1 hour
      });

      const hasPermission = requiredPermissions.every((p) => userData.permissions.includes(p));
      if (!hasPermission) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = {
  auth: auth(config),
  checkJwt,
  checkRole,
};
