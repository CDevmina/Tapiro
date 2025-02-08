const redisUtil = require('../../utils/redisUtil');

// Mock the redis client
jest.mock('redis', () => {
    const mockClient = {
        connect: jest.fn().mockResolvedValue(),
        get: jest.fn().mockResolvedValue(),
        set: jest.fn().mockResolvedValue(),
        on: jest.fn(),
    };
    return {
        createClient: jest.fn(() => mockClient),
    };
});

describe('RedisUtil', () => {
    let client;

    beforeEach(() => {
        client = require('redis').createClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should connect to Redis', async () => {
        await redisUtil.connectRedis();
        expect(client.connect).toHaveBeenCalled();
    });

    it('should get a value from Redis', async () => {
        const mockValue = 'test value';
        client.get.mockResolvedValue(mockValue);

        const value = await redisUtil.getCache('testKey');
        expect(client.get).toHaveBeenCalledWith('testKey');
        expect(value).toBe(mockValue);
    });

    it('should set a value in Redis', async () => {
        await redisUtil.setCache('testKey', 'testValue');
        expect(client.set).toHaveBeenCalledWith('testKey', 'testValue', {});
    });

    it('should set a value in Redis with options', async () => {
        const options = { EX: 60 };
        await redisUtil.setCache('testKey', 'testValue', options);
        expect(client.set).toHaveBeenCalledWith('testKey', 'testValue', options);
    });
});