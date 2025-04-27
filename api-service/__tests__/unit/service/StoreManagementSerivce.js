const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const {
  createApiKey,
  getApiKeys,
  revokeApiKey,
  getApiKeyUsage,
  getApiUsageLog,
} = require('../../../service/StoreManagementService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const authUtil = require('../../../utils/authUtil');
const writer = require('../../../utils/writer');
const { CACHE_KEYS, CACHE_TTL } = require('../../../utils/cacheConfig');

// Mock dependencies
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => ({
    toString: () => id || 'mockObjectId',
    equals: (other) => other.toString() === (id || 'mockObjectId'),
  })),
}));
jest.mock('crypto', () => ({
  randomBytes: jest
    .fn()
    .mockReturnValue(Buffer.from('mockrandombytesmockrandombytesmockrandombytesmockrandombytes')), // 32 bytes
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mockhashedkey'),
  }),
}));
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/authUtil');
jest.mock('../../../utils/writer');

describe('StoreManagementService - Unit Tests', () => {
  let mockDb;
  let mockStoresCollection;
  let mockApiUsageCollection;
  let mockUserData;
  let mockReq;
  let mockBody;
  let mockStoreDoc;
  let mockApiKey;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Collections
    mockStoresCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }), // Default success
    };
    mockApiUsageCollection = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      countDocuments: jest.fn(),
    };
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'stores') return mockStoresCollection;
        if (name === 'apiUsage') return mockApiUsageCollection;
        return {
          findOne: jest.fn(),
          updateOne: jest.fn(),
          find: jest.fn().mockReturnThis(),
          toArray: jest.fn(),
          countDocuments: jest.fn(),
        };
      }),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis
    redisUtil.getCache.mockResolvedValue(null); // Default cache miss
    redisUtil.setCache.mockResolvedValue('OK');
    redisUtil.invalidateCache.mockResolvedValue(1);

    // Mock Auth Utils
    mockUserData = {
      sub: 'auth0|storeMgmt123',
      email: 'storeMgmt@example.com',
    };
    authUtil.getUserData.mockResolvedValue(mockUserData);

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock Request
    mockReq = {
      headers: { authorization: 'Bearer mockToken' },
      user: mockUserData, // Assume middleware added user
      query: {}, // For endpoints with query params
      body: {}, // For endpoints with body
    };

    // Mock API Key (as stored in DB)
    mockApiKey = {
      keyId: 'key123',
      prefix: 'mockrand', // First 8 chars of mock randomBytes hex
      hashedKey: 'mockhashedkey',
      name: 'Test Key',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    // Mock Store Document from DB
    mockStoreDoc = {
      _id: new ObjectId('mockStoreMgmtId'),
      auth0Id: mockUserData.sub,
      name: 'Management Store',
      apiKeys: [mockApiKey],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset ObjectId mock implementation for each test
    ObjectId.mockImplementation((id) => ({
      toString: () => id || 'mockObjectId',
      equals: (other) => other.toString() === (id || 'mockObjectId'),
    }));
  });

  // --- createApiKey Tests ---
  describe('createApiKey', () => {
    beforeEach(() => {
      mockBody = { name: 'New Key Name' };
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc); // Store exists
      // Mock ObjectId to return a predictable new ID for the key
      ObjectId.mockImplementationOnce(() => ({ toString: () => 'newKeyId123' }));
    });

    it('should create a new API key successfully', async () => {
      const result = await createApiKey(mockReq, mockBody);

      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockStoresCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockStoreDoc._id },
        {
          $push: {
            apiKeys: expect.objectContaining({
              keyId: 'newKeyId123',
              prefix: 'mockrand', // From mock crypto
              hashedKey: 'mockhashedkey', // From mock crypto
              name: 'New Key Name',
              status: 'active',
            }),
          },
          $set: { updatedAt: expect.any(Date) },
        },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        201,
        expect.objectContaining({
          keyId: 'newKeyId123',
          name: 'New Key Name',
          prefix: 'mockrand',
          apiKey: expect.stringContaining('mockrandombytes'), // Check raw key is returned
        }),
      );
      expect(result.code).toBe(201);
    });

    it('should use default name if not provided', async () => {
      delete mockBody.name;
      await createApiKey(mockReq, mockBody);
      expect(mockStoresCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $push: { apiKeys: expect.objectContaining({ name: 'API Key' }) },
        }),
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        201,
        expect.objectContaining({ name: 'API Key' }),
      );
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null); // Store doesn't exist
      const result = await createApiKey(mockReq, mockBody);
      expect(mockStoresCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockStoresCollection.updateOne.mockRejectedValue(dbError);
      const result = await createApiKey(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- getApiKeys Tests ---
  describe('getApiKeys', () => {
    it('should return API keys from cache if available', async () => {
      redisUtil.getCache.mockResolvedValue(JSON.stringify(mockStoreDoc));
      const result = await getApiKeys(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(mockStoresCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, [
        expect.objectContaining({
          keyId: mockApiKey.keyId,
          name: mockApiKey.name,
          prefix: mockApiKey.prefix,
          status: mockApiKey.status,
          // hashedKey should NOT be present
        }),
      ]);
      expect(result.code).toBe(200);
      expect(result.payload[0].hashedKey).toBeUndefined();
    });

    it('should return API keys from DB if not in cache', async () => {
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc);
      const result = await getApiKeys(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
        JSON.stringify(mockStoreDoc),
        { EX: CACHE_TTL.STORE_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, [
        expect.objectContaining({
          keyId: mockApiKey.keyId,
          // hashedKey should NOT be present
        }),
      ]);
      expect(result.code).toBe(200);
      expect(result.payload[0].hashedKey).toBeUndefined();
    });

    it('should return empty array if store has no API keys', async () => {
      const storeWithoutKeys = { ...mockStoreDoc, apiKeys: [] };
      mockStoresCollection.findOne.mockResolvedValue(storeWithoutKeys);
      const result = await getApiKeys(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, []);
      expect(result.code).toBe(200);
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null);
      const result = await getApiKeys(mockReq);
      expect(redisUtil.setCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB query failed');
      mockStoresCollection.findOne.mockRejectedValue(dbError);
      const result = await getApiKeys(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- revokeApiKey Tests ---
  describe('revokeApiKey', () => {
    const keyIdToRevoke = mockApiKey.keyId;

    beforeEach(() => {
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc); // Store and key exist
    });

    it('should revoke an active API key successfully', async () => {
      const result = await revokeApiKey(mockReq, keyIdToRevoke);

      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(mockStoresCollection.updateOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub, 'apiKeys.keyId': keyIdToRevoke },
        {
          $set: {
            'apiKeys.$.status': 'revoked',
            updatedAt: expect.any(Date),
          },
        },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(204);
      expect(result.code).toBe(204);
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null);
      const result = await revokeApiKey(mockReq, keyIdToRevoke);
      expect(mockStoresCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 404 if API key not found within the store', async () => {
      const result = await revokeApiKey(mockReq, 'nonexistentKeyId');
      expect(mockStoresCollection.updateOne).not.toHaveBeenCalled(); // Should not attempt update if key isn't found in the initial find
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'API key not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 400 if API key is already revoked', async () => {
      const revokedKeyStore = { ...mockStoreDoc, apiKeys: [{ ...mockApiKey, status: 'revoked' }] };
      mockStoresCollection.findOne.mockResolvedValue(revokedKeyStore);
      const result = await revokeApiKey(mockReq, keyIdToRevoke);
      expect(mockStoresCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'API key is already revoked',
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockStoresCollection.updateOne.mockRejectedValue(dbError);
      const result = await revokeApiKey(mockReq, keyIdToRevoke);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- getApiKeyUsage Tests ---
  describe('getApiKeyUsage', () => {
    const keyIdForUsage = mockApiKey.keyId;
    const mockUsageData = [
      {
        _id: 'usage1',
        apiKeyId: keyIdForUsage,
        storeId: mockStoreDoc._id.toString(),
        method: 'GET',
        endpoint: '/users/123/preferences',
        timestamp: new Date('2024-03-15T10:00:00Z'),
      },
      {
        _id: 'usage2',
        apiKeyId: keyIdForUsage,
        storeId: mockStoreDoc._id.toString(),
        method: 'POST',
        endpoint: '/users/data',
        timestamp: new Date('2024-03-15T11:00:00Z'),
      },
      {
        _id: 'usage3',
        apiKeyId: keyIdForUsage,
        storeId: mockStoreDoc._id.toString(),
        method: 'GET',
        endpoint: '/users/456/preferences',
        timestamp: new Date('2024-03-16T09:00:00Z'),
      },
    ];

    beforeEach(() => {
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc); // Store and key exist
      mockApiUsageCollection.toArray.mockResolvedValue(mockUsageData); // Mock usage data
      mockReq.body = {}; // Default no date filters
    });

    it('should get API key usage successfully', async () => {
      const result = await getApiKeyUsage(mockReq, keyIdForUsage);

      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(mockDb.collection).toHaveBeenCalledWith('apiUsage');
      expect(mockApiUsageCollection.find).toHaveBeenCalledWith({
        apiKeyId: keyIdForUsage,
        storeId: mockStoreDoc._id.toString(),
        // No timestamp filter by default
      });
      expect(mockApiUsageCollection.toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        keyId: keyIdForUsage,
        prefix: mockApiKey.prefix,
        name: mockApiKey.name,
        totalRequests: 3,
        methodBreakdown: { GET: 2, POST: 1 },
        endpointBreakdown: {
          '/users/123/preferences': 1,
          '/users/data': 1,
          '/users/456/preferences': 1,
        },
        dailyUsage: [
          { date: '2024-03-15', count: 2 },
          { date: '2024-03-16', count: 1 },
        ],
      });
      expect(result.code).toBe(200);
    });

    it('should apply date filters correctly', async () => {
      mockReq.body = { startDate: '2024-03-16', endDate: '2024-03-16' };
      await getApiKeyUsage(mockReq, keyIdForUsage);

      expect(mockApiUsageCollection.find).toHaveBeenCalledWith({
        apiKeyId: keyIdForUsage,
        storeId: mockStoreDoc._id.toString(),
        timestamp: {
          $gte: new Date('2024-03-16'),
          $lte: new Date('2024-03-16'),
        },
      });
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null);
      const result = await getApiKeyUsage(mockReq, keyIdForUsage);
      expect(mockApiUsageCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 404 if API key not found within the store', async () => {
      const result = await getApiKeyUsage(mockReq, 'nonexistentKeyId');
      expect(mockApiUsageCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'API key not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB find failed');
      mockApiUsageCollection.toArray.mockRejectedValue(dbError);
      const result = await getApiKeyUsage(mockReq, keyIdForUsage);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- getApiUsageLog Tests ---
  describe('getApiUsageLog', () => {
    const mockLogData = [
      {
        _id: 'log3',
        apiKeyId: 'key123',
        storeId: mockStoreDoc._id.toString(),
        method: 'GET',
        endpoint: '/users/456/preferences',
        timestamp: new Date('2024-03-16T09:00:00Z'),
      },
      {
        _id: 'log2',
        apiKeyId: 'key123',
        storeId: mockStoreDoc._id.toString(),
        method: 'POST',
        endpoint: '/users/data',
        timestamp: new Date('2024-03-15T11:00:00Z'),
      },
      {
        _id: 'log1',
        apiKeyId: 'key123',
        storeId: mockStoreDoc._id.toString(),
        method: 'GET',
        endpoint: '/users/123/preferences',
        timestamp: new Date('2024-03-15T10:00:00Z'),
      },
    ];
    const totalItems = 3;

    beforeEach(() => {
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc); // Store exists
      mockApiUsageCollection.countDocuments.mockResolvedValue(totalItems);
      mockApiUsageCollection.toArray.mockResolvedValue(mockLogData);
      mockReq.query = { page: '1', limit: '15' }; // Default query params
    });

    it('should get API usage log successfully with default pagination', async () => {
      const result = await getApiUsageLog(mockReq);

      expect(mockStoresCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { _id: 1 } },
      );
      expect(mockDb.collection).toHaveBeenCalledWith('apiUsage');
      expect(mockApiUsageCollection.countDocuments).toHaveBeenCalledWith({
        storeId: mockStoreDoc._id.toString(),
      });
      expect(mockApiUsageCollection.find).toHaveBeenCalledWith({
        storeId: mockStoreDoc._id.toString(),
      });
      expect(mockApiUsageCollection.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockApiUsageCollection.skip).toHaveBeenCalledWith(0);
      expect(mockApiUsageCollection.limit).toHaveBeenCalledWith(15);
      expect(mockApiUsageCollection.toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        logs: mockLogData,
        pagination: {
          currentPage: 1,
          totalPages: 1, // ceil(3 / 15)
          totalItems: 3,
          limit: 15,
        },
      });
      expect(result.code).toBe(200);
    });

    it('should apply filters correctly (keyId, dates, pagination)', async () => {
      mockReq.query = {
        keyId: 'key123',
        startDate: '2024-03-15',
        endDate: '2024-03-15',
        page: '2',
        limit: '1',
      };
      const expectedFilter = {
        storeId: mockStoreDoc._id.toString(),
        apiKeyId: 'key123',
        timestamp: {
          $gte: new Date('2024-03-15'),
          $lt: new Date('2024-03-16'), // endDate + 1 day
        },
      };
      mockApiUsageCollection.countDocuments.mockResolvedValue(2); // Assume 2 items match filter

      await getApiUsageLog(mockReq);

      expect(mockApiUsageCollection.countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(mockApiUsageCollection.find).toHaveBeenCalledWith(expectedFilter);
      expect(mockApiUsageCollection.skip).toHaveBeenCalledWith(1); // (page 2 - 1) * limit 1
      expect(mockApiUsageCollection.limit).toHaveBeenCalledWith(1);
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          pagination: expect.objectContaining({
            currentPage: 2,
            totalPages: 2, // ceil(2 / 1)
            totalItems: 2,
            limit: 1,
          }),
        }),
      );
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null);
      const result = await getApiUsageLog(mockReq);
      expect(mockApiUsageCollection.countDocuments).not.toHaveBeenCalled();
      expect(mockApiUsageCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 400 if startDate is invalid', async () => {
      mockReq.query.startDate = 'invalid-date';
      const result = await getApiUsageLog(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Invalid startDate format',
      });
      expect(result.code).toBe(400);
    });

    it('should return 400 if endDate is invalid', async () => {
      mockReq.query.endDate = 'invalid-date';
      const result = await getApiUsageLog(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Invalid endDate format',
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if DB count fails', async () => {
      const dbError = new Error('DB count failed');
      mockApiUsageCollection.countDocuments.mockRejectedValue(dbError);
      const result = await getApiUsageLog(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if DB find fails', async () => {
      const dbError = new Error('DB find failed');
      mockApiUsageCollection.toArray.mockRejectedValue(dbError);
      const result = await getApiUsageLog(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });
});
