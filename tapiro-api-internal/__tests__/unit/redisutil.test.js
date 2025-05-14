const redis = require('redis');
const { getCache, setCache } = require('../../utils/redisUtil');

describe('Redis Utilities - Unit Tests', () => {
  test('getCache should return cached value', async () => {
    const mockValue = 'test-value';
    redis.createClient().get.mockResolvedValue(mockValue);

    const result = await getCache('test-key');
    expect(result).toBe(mockValue);
  });

  test('setCache should store value', async () => {
    const mockSet = redis.createClient().set;

    await setCache('test-key', 'test-value');
    expect(mockSet).toHaveBeenCalledWith('test-key', 'test-value', {});
  });
});
