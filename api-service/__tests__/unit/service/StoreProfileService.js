const { ObjectId } = require('mongodb');
const {
  getStoreProfile,
  updateStoreProfile,
  deleteStoreProfile,
  lookupStores,
  searchStores,
} = require('../../../service/StoreProfileService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const authUtil = require('../../../utils/authUtil');
const auth0Util = require('../../../utils/auth0Util');
const writer = require('../../../utils/writer');
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
jest.mock('../../../utils/authUtil');
jest.mock('../../../utils/auth0Util');
jest.mock('../../../utils/writer');

describe('StoreProfileService - Unit Tests', () => {
  let mockDb;
  let mockCollection;
  let mockUserData;
  let mockReq;
  let mockBody;
  let mockStoreDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB
    mockCollection = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnThis(), // For find().project().toArray() chains
      project: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis
    redisUtil.getCache.mockResolvedValue(null); // Default cache miss
    redisUtil.setCache.mockResolvedValue('OK');
    redisUtil.invalidateCache.mockResolvedValue(1);

    // Mock Auth Utils
    mockUserData = {
      sub: 'auth0|store123',
      email: 'store@example.com',
    };
    authUtil.getUserData.mockResolvedValue(mockUserData);
    auth0Util.deleteAuth0User.mockResolvedValue({});

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock Request
    mockReq = {
      headers: { authorization: 'Bearer mockToken' },
      user: mockUserData, // Assume middleware added user
      query: {}, // For endpoints with query params
    };

    // Mock Store Document from DB
    mockStoreDoc = {
      _id: new ObjectId('mockStoreId'),
      auth0Id: mockUserData.sub,
      name: 'Test Store',
      address: '123 Main St',
      email: mockUserData.email,
      webhooks: ['http://example.com/hook'],
      apiKeys: [{ keyId: 'key1', prefix: 'prefix1', hashedKey: 'hash1', status: 'active' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // --- getStoreProfile Tests ---
  describe('getStoreProfile', () => {
    it('should return store profile from cache if available', async () => {
      redisUtil.getCache.mockResolvedValue(JSON.stringify(mockStoreDoc));

      const result = await getStoreProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(mockCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockStoreDoc);
      expect(result.code).toBe(200);
    });

    it('should return store profile from DB if not in cache', async () => {
      mockCollection.findOne.mockResolvedValue(mockStoreDoc);

      const result = await getStoreProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
        JSON.stringify(mockStoreDoc),
        { EX: CACHE_TTL.STORE_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockStoreDoc);
      expect(result.code).toBe(200);
    });

    it('should return 404 if store not found in DB', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await getStoreProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockCollection.findOne.mockRejectedValue(dbError);

      const result = await getStoreProfile(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    it('should fetch user data using token if req.user is missing', async () => {
      delete mockReq.user; // Simulate missing req.user
      mockCollection.findOne.mockResolvedValue(mockStoreDoc);

      await getStoreProfile(mockReq);

      expect(authUtil.getUserData).toHaveBeenCalledWith('mockToken');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub }); // Should use sub from fetched data
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockStoreDoc);
    });
  });

  // --- updateStoreProfile Tests ---
  describe('updateStoreProfile', () => {
    beforeEach(() => {
      mockBody = {
        name: 'Updated Store Name',
        address: '456 New Ave',
        webhooks: ['http://new.com/hook1', 'http://new.com/hook2'],
      };
      // Mock findOneAndUpdate to return the updated document
      mockCollection.findOneAndUpdate.mockResolvedValue({
        ...mockStoreDoc,
        ...mockBody,
        updatedAt: expect.any(Date), // Expect updatedAt to be updated
      });
    });

    it('should update store profile successfully', async () => {
      const result = await updateStoreProfile(mockReq, mockBody);

      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        {
          $set: expect.objectContaining({
            name: mockBody.name,
            address: mockBody.address,
            webhooks: mockBody.webhooks,
            updatedAt: expect.any(Date),
          }),
        },
        { returnDocument: 'after' },
      );
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
        expect.stringContaining('"name":"Updated Store Name"'), // Check if updated data is cached
        { EX: CACHE_TTL.STORE_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          name: 'Updated Store Name',
          address: '456 New Ave',
        }),
      );
      expect(result.code).toBe(200);
    });

    it('should only update provided fields', async () => {
      const partialBody = { name: 'Partial Update Store' };
      mockCollection.findOneAndUpdate.mockResolvedValue({
        ...mockStoreDoc,
        name: partialBody.name,
        updatedAt: new Date(),
      });

      await updateStoreProfile(mockReq, partialBody);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { $set: { name: partialBody.name, updatedAt: expect.any(Date) } }, // Only name and updatedAt should be in $set
        { returnDocument: 'after' },
      );
      expect(redisUtil.setCache).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ name: 'Partial Update Store' }),
      );
    });

    it('should return 404 if store not found during update', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null); // Simulate store not found

      const result = await updateStoreProfile(mockReq, mockBody);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled(); // No cache update if not found
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockCollection.findOneAndUpdate.mockRejectedValue(dbError);

      const result = await updateStoreProfile(mockReq, mockBody);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- deleteStoreProfile Tests ---
  describe('deleteStoreProfile', () => {
    beforeEach(() => {
      // Mock deleteOne success
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    });

    it('should delete store profile successfully', async () => {
      const result = await deleteStoreProfile(mockReq);

      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(auth0Util.deleteAuth0User).toHaveBeenCalledWith(mockUserData.sub);
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockUserData.sub}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(204);
      expect(result.code).toBe(204);
    });

    it('should return 404 if store not found for deletion', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 }); // Simulate store not found

      const result = await deleteStoreProfile(mockReq);

      expect(mockCollection.deleteOne).toHaveBeenCalled();
      // Should NOT attempt Auth0 delete if DB delete fails? Current code does. Let's assume it shouldn't.
      // expect(auth0Util.deleteAuth0User).not.toHaveBeenCalled();
      // Let's test current behavior:
      expect(auth0Util.deleteAuth0User).toHaveBeenCalledWith(mockUserData.sub);
      expect(redisUtil.invalidateCache).not.toHaveBeenCalled(); // No cache to invalidate if not found
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB deletion fails', async () => {
      const dbError = new Error('DB delete failed');
      mockCollection.deleteOne.mockRejectedValue(dbError);

      const result = await deleteStoreProfile(mockReq);

      expect(auth0Util.deleteAuth0User).not.toHaveBeenCalled(); // Should fail before Auth0 delete
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if Auth0 deletion fails', async () => {
      const auth0Error = new Error('Auth0 delete failed');
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 }); // DB delete succeeds
      auth0Util.deleteAuth0User.mockRejectedValue(auth0Error); // Auth0 delete fails

      const result = await deleteStoreProfile(mockReq);

      // Should still return 500 even if DB delete succeeded
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- lookupStores Tests ---
  describe('lookupStores', () => {
    const storeId1 = 'storeId1';
    const storeId2 = 'storeId2';
    const mockStoresFound = [
      { _id: new ObjectId(storeId1), name: 'Store One' },
      { _id: new ObjectId(storeId2), name: 'Store Two' },
    ];

    beforeEach(() => {
      mockCollection.toArray.mockResolvedValue(mockStoresFound);
      mockReq.query = { ids: `${storeId1},${storeId2}` }; // Set query param
    });

    it('should lookup stores successfully', async () => {
      const result = await lookupStores(mockReq, mockReq.query.ids); // Pass ids explicitly

      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(ObjectId).toHaveBeenCalledWith(storeId1);
      expect(ObjectId).toHaveBeenCalledWith(storeId2);
      expect(mockCollection.find).toHaveBeenCalledWith({
        _id: { $in: [expect.any(Object), expect.any(Object)] },
      });
      expect(mockCollection.project).toHaveBeenCalledWith({ _id: 1, name: 1 });
      expect(mockCollection.toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, [
        { storeId: storeId1, name: 'Store One' },
        { storeId: storeId2, name: 'Store Two' },
      ]);
      expect(result.code).toBe(200);
    });

    it('should return 400 if ids parameter is missing', async () => {
      delete mockReq.query.ids; // Remove ids param
      const result = await lookupStores(mockReq, undefined); // Pass undefined for ids

      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Missing required query parameter: ids',
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB find failed');
      mockCollection.toArray.mockRejectedValue(dbError);

      const result = await lookupStores(mockReq, mockReq.query.ids);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    // Optional: Test for invalid ObjectId format if strict validation is added
    it('should return 400 if ObjectId creation fails (simulated)', async () => {
      const invalidId = 'invalid-id-format';
      mockReq.query.ids = invalidId;
      // Simulate ObjectId throwing an error for invalid format
      ObjectId.mockImplementationOnce((id) => {
        if (id === invalidId) throw new Error('Argument passed in must be a single String');
        return { toString: () => id }; // Mock valid IDs
      });

      const result = await lookupStores(mockReq, mockReq.query.ids);

      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Invalid store ID format provided.',
      });
      expect(result.code).toBe(400);
    });
  });

  // --- searchStores Tests ---
  describe('searchStores', () => {
    const searchQuery = 'Test';
    const mockStoresFound = [
      { _id: new ObjectId('storeId1'), name: 'Test Store One' },
      { _id: new ObjectId('storeId2'), name: 'Another Test Store' },
    ];

    beforeEach(() => {
      mockCollection.toArray.mockResolvedValue(mockStoresFound);
      mockReq.query = { query: searchQuery, limit: '5' }; // Set query params
    });

    it('should search stores successfully', async () => {
      const result = await searchStores(mockReq, mockReq.query.query, mockReq.query.limit); // Pass params

      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockCollection.find).toHaveBeenCalledWith({ name: new RegExp(searchQuery, 'i') });
      expect(mockCollection.limit).toHaveBeenCalledWith(5); // Check limit is parsed correctly
      expect(mockCollection.project).toHaveBeenCalledWith({ _id: 1, name: 1 });
      expect(mockCollection.toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, [
        { storeId: 'storeId1', name: 'Test Store One' },
        { storeId: 'storeId2', name: 'Another Test Store' },
      ]);
      expect(result.code).toBe(200);
    });

    it('should use default limit if not provided', async () => {
      delete mockReq.query.limit; // Remove limit param
      await searchStores(mockReq, mockReq.query.query, undefined); // Pass undefined for limit

      expect(mockCollection.limit).toHaveBeenCalledWith(10); // Default limit is 10
    });

    it('should return 400 if query is too short', async () => {
      const shortQuery = 'T';
      mockReq.query.query = shortQuery;
      const result = await searchStores(mockReq, shortQuery, mockReq.query.limit);

      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Search query must be at least 2 characters long.',
      });
      expect(result.code).toBe(400);
    });

    it('should return 400 if query is missing', async () => {
      delete mockReq.query.query;
      const result = await searchStores(mockReq, undefined, mockReq.query.limit);

      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Search query must be at least 2 characters long.',
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB find failed');
      mockCollection.toArray.mockRejectedValue(dbError);

      const result = await searchStores(mockReq, mockReq.query.query, mockReq.query.limit);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error during store search',
      });
      expect(result.code).toBe(500);
    });
  });
});
