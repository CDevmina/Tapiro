require('dotenv').config();
const redis = require('redis');

const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
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

// Add this function to your existing redisUtil.js
async function invalidateCache(key) {
  return setCache(key, '', { EX: CACHE_TTL.INVALIDATION });
}

// Export the new function
module.exports = { 
  client,
  connectRedis,
  getCache,
  setCache,
  invalidateCache 
};
