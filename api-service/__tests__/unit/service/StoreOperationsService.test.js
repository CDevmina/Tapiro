const { ObjectId } = require('mongodb');
const { getUserPreferences, submitUserData } = require('../../../service/StoreOperationsService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const writer = require('../../../utils/writer');
const AIService = require('../../../clients/AIService');
const { CACHE_KEYS, CACHE_TTL } = require('../../../utils/cacheConfig');

// Mock dependencies
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => ({
    toString: () => id || 'mockObjectId',
    equals: (other) => other.toString() === (id || 'mockObjectId'),
  })),
}));
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/writer');
jest.mock('../../../clients/AIService'); // Mock the AI Service client

describe('StoreOperationsService - Unit Tests', () => {
  let mockDb;
  let mockUsersCollection;
  let mockUserDataCollection;
  let mockReq;
  let mockBody;
  let mockUserDoc;
  let mockStoreId;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Collections
    mockUsersCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }), // Default success
    };
    mockUserDataCollection = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mockDataId' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'users') return mockUsersCollection;
        if (name === 'userData') return mockUserDataCollection;
        return { findOne: jest.fn(), updateOne: jest.fn(), insertOne: jest.fn() };
      }),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis
    redisUtil.getCache.mockResolvedValue(null); // Default cache miss
    redisUtil.setCache.mockResolvedValue('OK');
    redisUtil.invalidateCache.mockResolvedValue(1);

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock AI Service
    AIService.processUserData.mockResolvedValue({ status: 'processing_started' }); // Default success

    // Mock Store ID (set by apiKeyMiddleware)
    mockStoreId = 'store123';

    // Mock Request (simulating request after apiKeyMiddleware)
    mockReq = {
      headers: { 'x-api-key': 'mockApiKey' },
      storeId: mockStoreId, // IMPORTANT: Simulate storeId being set
      body: {},
      params: {},
    };

    // Mock User Document from DB
    mockUserDoc = {
      _id: new ObjectId('mockUserIdOps'),
      auth0Id: 'auth0|userOps123',
      username: 'userops',
      email: 'userops@example.com',
      preferences: [{ category: '101', score: 0.7 }],
      privacySettings: {
        dataSharingConsent: true,
        optInStores: [], // Start with no opt-ins
        optOutStores: [], // Start with no opt-outs
      },
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    // Reset ObjectId mock implementation
    ObjectId.mockImplementation((id) => ({
      toString: () => id || 'mockObjectId',
      equals: (other) => other.toString() === (id || 'mockObjectId'),
    }));
  });

  // --- getUserPreferences Tests ---
  describe('getUserPreferences', () => {
    const userIdParam = mockUserDoc.email; // Use email as userId identifier

    beforeEach(() => {
      mockReq.params = { userId: userIdParam };
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc); // Default: user found
    });

    it('should return user preferences from cache if available', async () => {
      const cachedPrefs = {
        userId: mockUserDoc._id.toString(),
        preferences: mockUserDoc.preferences,
        updatedAt: mockUserDoc.updatedAt,
      };
      const cacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userIdParam}:${mockStoreId}`;
      redisUtil.getCache.mockResolvedValue(JSON.stringify(cachedPrefs));

      const result = await getUserPreferences(mockReq, userIdParam);

      expect(redisUtil.getCache).toHaveBeenCalledWith(cacheKey);
      expect(mockUsersCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, cachedPrefs);
      expect(result.code).toBe(200);
    });

    it('should return user preferences from DB if not in cache and auto opt-in', async () => {
      const cacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userIdParam}:${mockStoreId}`;
      const expectedResponse = {
        userId: mockUserDoc._id.toString(),
        preferences: mockUserDoc.preferences,
        updatedAt: mockUserDoc.updatedAt,
      };

      const result = await getUserPreferences(mockReq, userIdParam);

      expect(redisUtil.getCache).toHaveBeenCalledWith(cacheKey);
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ email: userIdParam });
      // Check auto opt-in
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        {
          $addToSet: { 'privacySettings.optInStores': mockStoreId },
          $set: { updatedAt: expect.any(Date) },
        },
      );
      expect(redisUtil.setCache).toHaveBeenCalledWith(cacheKey, JSON.stringify(expectedResponse), {
        EX: CACHE_TTL.USER_DATA,
      });
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, expectedResponse);
      expect(result.code).toBe(200);
    });

    it('should return preferences without opt-in if user already opted in', async () => {
      const optedInUser = {
        ...mockUserDoc,
        privacySettings: { ...mockUserDoc.privacySettings, optInStores: [mockStoreId] },
      };
      mockUsersCollection.findOne.mockResolvedValue(optedInUser);

      await getUserPreferences(mockReq, userIdParam);

      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ email: userIdParam });
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled(); // Should NOT opt-in again
      expect(redisUtil.setCache).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, expect.any(Object));
    });

    it('should return 401 if req.storeId is missing', async () => {
      delete mockReq.storeId; // Simulate missing storeId
      const result = await getUserPreferences(mockReq, userIdParam);
      expect(writer.respondWithCode).toHaveBeenCalledWith(401, {
        code: 401,
        message: 'Invalid API key',
      });
      expect(result.code).toBe(401);
    });

    it('should return 404 if user not found', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      const result = await getUserPreferences(mockReq, userIdParam);
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 403 if user consent is false', async () => {
      const noConsentUser = {
        ...mockUserDoc,
        privacySettings: { ...mockUserDoc.privacySettings, dataSharingConsent: false },
      };
      mockUsersCollection.findOne.mockResolvedValue(noConsentUser);
      const result = await getUserPreferences(mockReq, userIdParam);
      expect(writer.respondWithCode).toHaveBeenCalledWith(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
      expect(result.code).toBe(403);
    });

    it('should return 403 if user opted out from store', async () => {
      const optedOutUser = {
        ...mockUserDoc,
        privacySettings: { ...mockUserDoc.privacySettings, optOutStores: [mockStoreId] },
      };
      mockUsersCollection.findOne.mockResolvedValue(optedOutUser);
      const result = await getUserPreferences(mockReq, userIdParam);
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled(); // Should not opt-in if opted-out
      expect(writer.respondWithCode).toHaveBeenCalledWith(403, {
        code: 403,
        message: 'No consent: user has opted out from sharing data with this store',
      });
      expect(result.code).toBe(403);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB find failed');
      mockUsersCollection.findOne.mockRejectedValue(dbError);
      const result = await getUserPreferences(mockReq, userIdParam);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- submitUserData Tests ---
  describe('submitUserData', () => {
    beforeEach(() => {
      mockBody = {
        email: mockUserDoc.email,
        dataType: 'purchase',
        entries: [
          {
            timestamp: '2024-04-27T10:00:00Z',
            items: [{ name: 'Laptop', category: '102', price: '1200.50', quantity: '1' }],
          },
          {
            timestamp: new Date('2024-04-27T11:00:00Z'),
            items: [{ name: 'Mouse', category: '105', price: 25 }],
          }, // Test Date object and missing quantity
        ],
        metadata: { transactionId: 'tx123' },
      };
      mockReq.body = mockBody;
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc); // Default: user found
    });

    it('should submit user data successfully and call AI service', async () => {
      const result = await submitUserData(mockReq, mockBody);

      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ email: mockBody.email });
      // Check auto opt-in
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        {
          $addToSet: { 'privacySettings.optInStores': mockStoreId },
          $set: { updatedAt: expect.any(Date) },
        },
      );
      expect(mockUserDataCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserDoc._id,
          storeId: mockStoreId,
          email: mockBody.email,
          dataType: 'purchase',
          processedStatus: 'pending',
          entries: expect.arrayContaining([
            expect.objectContaining({
              timestamp: new Date('2024-04-27T10:00:00Z'), // Check conversion
              items: expect.arrayContaining([
                expect.objectContaining({ price: 1200.5, quantity: 1 }),
              ]), // Check parsing
            }),
            expect.objectContaining({
              timestamp: new Date('2024-04-27T11:00:00Z'),
              items: expect.arrayContaining([expect.objectContaining({ price: 25, quantity: 1 })]), // Check default quantity
            }),
          ]),
        }),
      );
      expect(AIService.processUserData).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockBody.email,
          data_type: 'purchase',
          metadata: expect.objectContaining({
            storeId: mockStoreId,
            userId: mockUserDoc._id.toString(),
          }),
        }),
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:${mockStoreId}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserDoc.auth0Id}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(202, {
        message: 'Data accepted for processing',
        aiProcessing: 'processing_started',
      });
      expect(result.code).toBe(202);
    });

    it('should submit data and return 202 if AI service fails', async () => {
      const aiError = new Error('AI service unavailable');
      AIService.processUserData.mockRejectedValue(aiError);

      const result = await submitUserData(mockReq, mockBody);

      expect(mockUserDataCollection.insertOne).toHaveBeenCalled();
      expect(AIService.processUserData).toHaveBeenCalled();
      // Check if status was updated to 'failed'
      expect(mockUserDataCollection.updateOne).toHaveBeenCalledWith(
        { _id: 'mockDataId' }, // From insertOne mock
        { $set: { processedStatus: 'failed' } },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(202, {
        message: 'Data accepted but AI processing delayed',
        retryScheduled: true,
      });
      expect(result.code).toBe(202);
    });

    it('should return 401 if req.storeId is missing', async () => {
      delete mockReq.storeId;
      const result = await submitUserData(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(401, {
        code: 401,
        message: 'Invalid API key',
      });
      expect(result.code).toBe(401);
    });

    it('should return 400 if entries is not an array', async () => {
      mockBody.entries = {};
      const result = await submitUserData(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Entries must be an array',
      });
      expect(result.code).toBe(400);
    });

    it('should return 400 if dataType is invalid', async () => {
      mockBody.dataType = 'invalidType';
      const result = await submitUserData(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'dataType must be either "purchase" or "search"',
      });
      expect(result.code).toBe(400);
    });

    it('should return 404 if user not found', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      const result = await submitUserData(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 403 if user consent is false', async () => {
      const noConsentUser = {
        ...mockUserDoc,
        privacySettings: { ...mockUserDoc.privacySettings, dataSharingConsent: false },
      };
      mockUsersCollection.findOne.mockResolvedValue(noConsentUser);
      const result = await submitUserData(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
      expect(result.code).toBe(403);
    });

    it('should return 403 if user opted out from store', async () => {
      const optedOutUser = {
        ...mockUserDoc,
        privacySettings: { ...mockUserDoc.privacySettings, optOutStores: [mockStoreId] },
      };
      mockUsersCollection.findOne.mockResolvedValue(optedOutUser);
      const result = await submitUserData(mockReq, mockBody);
      expect(mockUserDataCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(403, {
        code: 403,
        message: 'No consent: user has opted out from sharing data with this store',
      });
      expect(result.code).toBe(403);
    });

    it('should return 500 if DB insertion fails', async () => {
      const dbError = new Error('DB insert failed');
      mockUserDataCollection.insertOne.mockRejectedValue(dbError);
      const result = await submitUserData(mockReq, mockBody);
      expect(AIService.processUserData).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    // Add test for 'search' dataType processing if needed
    it('should process search data correctly', async () => {
      mockBody.dataType = 'search';
      mockBody.entries = [
        { timestamp: '2024-04-27T12:00:00Z', query: 'blue shoes', results: '15' },
      ];
      await submitUserData(mockReq, mockBody);
      expect(mockUserDataCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          dataType: 'search',
          entries: expect.arrayContaining([
            expect.objectContaining({ query: 'blue shoes', results: 15 }), // Check parsing
          ]),
        }),
      );
      expect(AIService.processUserData).toHaveBeenCalledWith(
        expect.objectContaining({ data_type: 'search' }),
      );
    });
  });
});
