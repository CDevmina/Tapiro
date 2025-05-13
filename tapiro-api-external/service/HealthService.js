const { getDB } = require('../utils/mongoUtil');
const { pingRedis } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const AIService = require('../clients/AIService');

/**
 * Simplified health check for external API
 */
exports.healthCheck = async function (req) {
  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'tapiro-external-api',
      version: '1.0.0',
      dependencies: {
        database: 'disconnected',
        cache: 'disconnected',
        ai_service: 'disconnected'
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

    // Check Redis connection
    try {
      const pingResult = await pingRedis();
      response.dependencies.cache = pingResult === 'PONG' ? 'connected' : 'degraded';
    } catch (error) {
      console.error('Redis health check failed:', error);
      response.status = 'degraded';
    }

    // Check AI service connection
    try {
      const aiHealth = await AIService.checkHealth();
      response.dependencies.ai_service = aiHealth.status;
    } catch (error) {
      console.error('AI service health check failed:', error);
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
 */
exports.ping = async function (req) {
  return respondWithCode(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tapiro-external-api'
  });
};
