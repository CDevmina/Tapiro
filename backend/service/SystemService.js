'use strict';

const { getDB } = require('../utils/mongoUtil');
const { client: redisClient } = require('../utils/redisUtil');
const packageJson = require('../package.json');

exports.getHealth = async function () {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: packageJson.version,
        services: {
            database: 'disconnected',
            redis: 'disconnected'
        }
    };

    try {
        await getDB().command({ ping: 1 });
        health.services.database = 'connected';
    } catch (error) {
        health.status = 'unhealthy';
    }

    try {
        await redisClient.ping();
        health.services.redis = 'connected';
    } catch (error) {
        health.status = 'unhealthy';
    }

    return health;
};