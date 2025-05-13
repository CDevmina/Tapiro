const { getDB } = require('../utils/mongoUtil');
const { pingRedis } = require('../utils/redisUtil'); // Use pingRedis instead
const { respondWithCode } = require('../utils/writer');
const axios = require('axios');

/**
 * Comprehensive health check that verifies API and dependencies
 *
 * @param {Object} req - Express request object
 * @returns {Promise} - Response object with health status
 */
exports.healthCheck = async function (req) {
  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'tapiro-api',
      dependencies: {
        database: 'disconnected',
        cache: 'disconnected',
        auth: 'unknown',
      },
    };

    // Check MongoDB connection
    try {
      const db = getDB();
      await db.command({ ping: 1 });
      response.dependencies.database = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
      response.status = 'degraded';
    }

    // Check Redis connection - Updated to use pingRedis
    try {
      const pingResult = await pingRedis();
      response.dependencies.cache = pingResult === 'PONG' ? 'connected' : 'degraded';
    } catch (error) {
      console.error('Redis health check failed:', error);
      response.status = 'degraded';
    }

    // Optional: Check Auth0 connection
    try {
      const auth0Domain = process.env.AUTH0_DOMAIN;
      const auth0Response = await axios.get(`https://${auth0Domain}/.well-known/jwks.json`, {
        timeout: 3000,
      });
      response.dependencies.auth = auth0Response.status === 200 ? 'connected' : 'degraded';
    } catch (error) {
      console.error('Auth0 health check failed:', error);
      response.dependencies.auth = 'disconnected';
      response.status = 'degraded';
    }

    return respondWithCode(200, response);
  } catch (error) {
    console.error('Health check failed:', error);
    return respondWithCode(500, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal health check error',
    });
  }
};

/**
 * Simple ping endpoint for uptime monitoring
 *
 * @param {Object} req - Express request object
 * @returns {Promise} - Simple response indicating the API is up
 */
exports.ping = async function (req) {
  return respondWithCode(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
