require('dotenv').config();
const redis = require('redis');
const { CACHE_TTL } = require('./cacheConfig');

const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

async function connectRedis() {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Redis connection error:', error);
    console.log('Retrying Redis connection in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await connectRedis(); // Recursive retry
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

// Modified ping function to handle health checks safely
async function pingRedis() {
  try {
    return await client.ping();
  } catch (error) {
    console.error('Redis ping error:', error);
    return null;
  }
}

// Export the new function
module.exports = {
  client,
  connectRedis,
  getCache,
  setCache,
  invalidateCache,
  pingRedis,
};
