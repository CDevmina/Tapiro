const { auth } = require('express-openid-connect');
const { getCache } = require('../utils/redisUtil');

// Auth0 config
const config = {
    authRequired: true,
    auth0Logout: true,
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    clientID: process.env.AUTH0_CLIENT_ID,
    AUTH0_ISSUER_BASE_URL: 'https://dev-zuxebycdcmuazvo8.us.auth0.com',
    secret: process.env.AUTH0_CLIENT_SECRET
};

// Token validation middleware
const validateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Check Redis cache first
        const cachedToken = await getCache(`token:${token}`);
        if (!cachedToken) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Add user info to request
        req.user = JSON.parse(cachedToken);
        next();
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { auth: auth(config), validateToken };