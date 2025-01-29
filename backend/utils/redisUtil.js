const redis = require('redis');

const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

async function connectRedis() {
    try {
        await client.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Redis connection error:', error);
        process.exit(1);
    }
}


async function getCache(key) {
    return client.get(key);
}

async function setCache(key, value, options = {}) {
    return client.set(key, value, options);
}

module.exports = {
    client,
    connectRedis,
    getCache,
    setCache
};