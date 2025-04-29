const { healthCheck, ping } = require('../../../service/HealthService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const auth0Util = require('../../../utils/auth0Util');
const writer = require('../../../utils/writer');

// Mock dependencies
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/auth0Util');
jest.mock('../../../utils/writer');

describe('HealthService - Unit Tests', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Ping
    mockDb = {
      admin: jest.fn().mockReturnThis(),
      ping: jest.fn().mockResolvedValue({ ok: 1 }), // Default success
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis Ping
    redisUtil.pingRedis.mockResolvedValue('PONG'); // Default success

    // Mock Auth0 Ping
    auth0Util.pingAuth0.mockResolvedValue(true); // Default success

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));
  });

  // --- ping Tests ---
  describe('ping', () => {
    it('should return 200 with pong message', async () => {
      const result = await ping();

      expect(writer.respondWithCode).toHaveBeenCalledWith(200, { status: 'ok', message: 'pong' });
      expect(result.code).toBe(200);
      expect(result.payload.message).toBe('pong');
    });
  });

  // --- healthCheck Tests ---
  describe('healthCheck', () => {
    it('should return 200 with all services healthy', async () => {
      const result = await healthCheck();

      expect(mongoUtil.getDB).toHaveBeenCalled();
      expect(mockDb.admin).toHaveBeenCalled();
      expect(mockDb.ping).toHaveBeenCalled();
      expect(redisUtil.pingRedis).toHaveBeenCalled();
      expect(auth0Util.pingAuth0).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        status: 'ok',
        dependencies: {
          database: { status: 'ok' },
          cache: { status: 'ok' },
          auth0: { status: 'ok' },
        },
        timestamp: expect.any(String),
      });
      expect(result.code).toBe(200);
    });

    it('should return 503 if database ping fails', async () => {
      const dbError = new Error('DB connection failed');
      mockDb.ping.mockRejectedValue(dbError);

      const result = await healthCheck();

      expect(writer.respondWithCode).toHaveBeenCalledWith(503, {
        status: 'error',
        dependencies: {
          database: { status: 'error', error: dbError.message },
          cache: { status: 'ok' },
          auth0: { status: 'ok' },
        },
        timestamp: expect.any(String),
      });
      expect(result.code).toBe(503);
    });

    it('should return 503 if Redis ping fails', async () => {
      const redisError = new Error('Redis connection failed');
      redisUtil.pingRedis.mockRejectedValue(redisError);

      const result = await healthCheck();

      expect(writer.respondWithCode).toHaveBeenCalledWith(503, {
        status: 'error',
        dependencies: {
          database: { status: 'ok' },
          cache: { status: 'error', error: redisError.message },
          auth0: { status: 'ok' },
        },
        timestamp: expect.any(String),
      });
      expect(result.code).toBe(503);
    });

    it('should return 503 if Auth0 ping fails', async () => {
      const auth0Error = new Error('Auth0 connection failed');
      auth0Util.pingAuth0.mockRejectedValue(auth0Error);

      const result = await healthCheck();

      expect(writer.respondWithCode).toHaveBeenCalledWith(503, {
        status: 'error',
        dependencies: {
          database: { status: 'ok' },
          cache: { status: 'ok' },
          auth0: { status: 'error', error: auth0Error.message },
        },
        timestamp: expect.any(String),
      });
      expect(result.code).toBe(503);
    });

    it('should return 503 if multiple dependencies fail', async () => {
      const dbError = new Error('DB connection failed');
      const redisError = new Error('Redis connection failed');
      mockDb.ping.mockRejectedValue(dbError);
      redisUtil.pingRedis.mockRejectedValue(redisError);

      const result = await healthCheck();

      expect(writer.respondWithCode).toHaveBeenCalledWith(503, {
        status: 'error',
        dependencies: {
          database: { status: 'error', error: dbError.message },
          cache: { status: 'error', error: redisError.message },
          auth0: { status: 'ok' },
        },
        timestamp: expect.any(String),
      });
      expect(result.code).toBe(503);
    });
  });
});
