const { ObjectId } = require('mongodb'); // Import ObjectId
const {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getRecentUserData,
  getSpendingAnalytics,
} = require('../../../service/UserProfileService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const authUtil = require('../../../utils/authUtil');
const auth0Util = require('../../../utils/auth0Util');
const writer = require('../../../utils/writer');
const { CACHE_KEYS, CACHE_TTL } = require('../../../utils/cacheConfig');

// Mock dependencies
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => ({
    // Mock ObjectId constructor
    toString: () => id || 'mockObjectId',
    equals: (other) => other.toString() === (id || 'mockObjectId'),
  })),
}));
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/authUtil');
jest.mock('../../../utils/auth0Util');
jest.mock('../../../utils/writer');
// Mock TaxonomyService for getSpendingAnalytics
jest.mock('../../../service/TaxonomyService', () => ({
  getTaxonomyCategories: jest.fn(),
}));
const TaxonomyService = require('../../../service/TaxonomyService');

describe('UserProfileService - Unit Tests', () => {
  let mockDb;
  let mockCollection;
  let mockUserData;
  let mockReq;
  let mockBody;
  let mockUserDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB
    mockCollection = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnThis(), // For find().sort()... chains
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      aggregate: jest.fn().mockReturnThis(), // For aggregate().toArray()
      countDocuments: jest.fn(), // For pagination in getApiUsageLog
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
      sub: 'auth0|user123',
      email: 'user@example.com',
      nickname: 'testuser',
      phone_number: '1112223333',
    };
    authUtil.getUserData.mockResolvedValue(mockUserData);
    auth0Util.updateUserPhone.mockResolvedValue({});
    auth0Util.updateAuth0Username.mockResolvedValue({});
    auth0Util.deleteAuth0User.mockResolvedValue({});

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock Request
    mockReq = {
      headers: { authorization: 'Bearer mockToken' },
      user: mockUserData, // Assume middleware added user
      query: {}, // For endpoints with query params
    };

    // Mock User Document from DB
    mockUserDoc = {
      _id: new ObjectId('mockUserId'),
      auth0Id: mockUserData.sub,
      username: mockUserData.nickname,
      email: mockUserData.email,
      phone: mockUserData.phone_number,
      demographicData: { gender: 'female', age: 25 },
      privacySettings: { dataSharingConsent: true, optInStores: ['store1'], optOutStores: [] },
      preferences: [{ category: '101', score: 0.9 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Taxonomy for spending analytics
    TaxonomyService.getTaxonomyCategories.mockResolvedValue({
      code: 200,
      payload: {
        data: {
          categories: [
            { id: '101', name: 'Smartphones' },
            { id: '302', name: 'Kitchen' },
          ],
        },
      },
    });
  });

  // --- getUserProfile Tests ---
  describe('getUserProfile', () => {
    it('should return user profile from cache if available', async () => {
      const cachedData = { ...mockUserDoc };
      // IMPORTANT: getUserProfile removes preferences before returning
      delete cachedData.preferences;
      redisUtil.getCache.mockResolvedValue(JSON.stringify(cachedData));

      const result = await getUserProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(`${CACHE_KEYS.USER_DATA}${mockUserData.sub}`);
      expect(mockCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, cachedData);
      expect(result.code).toBe(200);
      expect(result.payload.preferences).toBeUndefined(); // Ensure preferences are not in the payload
    });

    it('should return user profile from DB if not in cache', async () => {
      const dbData = { ...mockUserDoc };
      // DB query excludes preferences
      delete dbData.preferences;
      mockCollection.findOne.mockResolvedValue(dbData);

      const result = await getUserProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(`${CACHE_KEYS.USER_DATA}${mockUserData.sub}`);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { preferences: 0 } }, // Verify projection
      );
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
        JSON.stringify(dbData),
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, dbData);
      expect(result.code).toBe(200);
      expect(result.payload.preferences).toBeUndefined();
    });

    it('should return 404 if user not found in DB', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await getUserProfile(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockCollection.findOne.mockRejectedValue(dbError);

      const result = await getUserProfile(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    it('should fetch user data using token if req.user is missing', async () => {
      delete mockReq.user; // Simulate missing req.user
      const dbData = { ...mockUserDoc };
      delete dbData.preferences;
      mockCollection.findOne.mockResolvedValue(dbData);

      await getUserProfile(mockReq);

      expect(authUtil.getUserData).toHaveBeenCalledWith('mockToken');
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub }, // Should use sub from fetched data
        expect.any(Object),
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, dbData);
    });
  });

  // --- updateUserProfile Tests ---
  describe('updateUserProfile', () => {
    beforeEach(() => {
      mockBody = {
        demographicData: {
          gender: 'non-binary',
          age: 31,
          hasKids: true,
        },
        privacySettings: {
          allowInference: false,
        },
      };
      // Mock the findOneAndUpdate to return the updated document
      mockCollection.findOneAndUpdate.mockResolvedValue({ ...mockUserDoc, ...mockBody }); // Simulate returnDocument: 'after'
    });

    it('should update user profile successfully', async () => {
      const result = await updateUserProfile(mockReq, mockBody);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        {
          $set: expect.objectContaining({
            'demographicData.gender': 'non-binary',
            'demographicData.inferredGender': null,
            'demographicData.age': 31,
            'demographicData.hasKids': true,
            'demographicData.inferredHasKids': null,
            'privacySettings.allowInference': false,
            updatedAt: expect.any(Date),
          }),
        },
        { returnDocument: 'after', projection: { preferences: 0 } },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
      );
      // Check if demographic/privacy related caches are invalidated
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      ); // General prefs invalidated due to demographics
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:store1`,
      ); // Store prefs invalidated
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
        expect.any(String), // Contains the updated doc
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          demographicData: expect.objectContaining({
            gender: 'non-binary',
            age: 31,
            hasKids: true,
          }),
          privacySettings: expect.objectContaining({ allowInference: false }),
        }),
      );
      expect(result.code).toBe(200);
    });

    it('should update username and phone in Auth0 and DB', async () => {
      mockBody.username = 'newusername';
      mockBody.phone = '9998887777';
      mockCollection.findOne.mockResolvedValue(null); // No username conflict
      mockCollection.findOneAndUpdate.mockResolvedValue({
        ...mockUserDoc,
        username: 'newusername',
        phone: '9998887777',
      });

      await updateUserProfile(mockReq, mockBody);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        username: 'newusername',
        auth0Id: { $ne: mockUserData.sub },
      });
      expect(auth0Util.updateAuth0Username).toHaveBeenCalledWith(mockUserData.sub, 'newusername');
      expect(auth0Util.updateUserPhone).toHaveBeenCalledWith(mockUserData.sub, '9998887777');
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { $set: expect.objectContaining({ username: 'newusername', phone: '9998887777' }) },
        expect.any(Object),
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ username: 'newusername', phone: '9998887777' }),
      );
    });

    it('should return 409 if username is taken', async () => {
      mockBody.username = 'existinguser';
      mockCollection.findOne.mockResolvedValue({ _id: 'otherUserId', username: 'existinguser' }); // Username conflict

      const result = await updateUserProfile(mockReq, mockBody);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        username: 'existinguser',
        auth0Id: { $ne: mockUserData.sub },
      });
      expect(auth0Util.updateAuth0Username).not.toHaveBeenCalled();
      expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(409, {
        code: 409,
        message: 'Username already taken',
      });
      expect(result.code).toBe(409);
    });

    it('should return 400 if Auth0 username update fails', async () => {
      mockBody.username = 'newusername';
      mockCollection.findOne.mockResolvedValue(null); // No username conflict
      const auth0Error = new Error('Auth0 username update failed');
      auth0Error.statusCode = 400; // Simulate Auth0 error response
      auth0Util.updateAuth0Username.mockRejectedValue(auth0Error);

      const result = await updateUserProfile(mockReq, mockBody);

      expect(auth0Util.updateAuth0Username).toHaveBeenCalledWith(mockUserData.sub, 'newusername');
      expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled(); // Should fail before DB update
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Failed to update username in Auth0',
        details: auth0Error.message,
      });
      expect(result.code).toBe(400);
    });

    it('should return 404 if user not found during update', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null); // Simulate user not found

      const result = await updateUserProfile(mockReq, mockBody);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(redisUtil.invalidateCache).not.toHaveBeenCalled(); // No cache to invalidate if not found
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found to update',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockCollection.findOneAndUpdate.mockRejectedValue(dbError);

      const result = await updateUserProfile(mockReq, mockBody);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error during profile update',
      });
      expect(result.code).toBe(500);
    });

    // Add more tests: invalid age, only updating privacy, no changes provided, etc.
  });

  // --- deleteUserProfile Tests ---
  describe('deleteUserProfile', () => {
    beforeEach(() => {
      // Mock findOne to return the user for cache invalidation lookup
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      // Mock deleteOne success
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    });

    it('should delete user profile successfully', async () => {
      const result = await deleteUserProfile(mockReq);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { _id: 1, privacySettings: 1 } },
      );
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(auth0Util.deleteAuth0User).toHaveBeenCalledWith(mockUserData.sub);
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:store1`,
      ); // Invalidate store prefs
      expect(writer.respondWithCode).toHaveBeenCalledWith(204);
      expect(result.code).toBe(204);
    });

    it('should return 404 if user not found for deletion', async () => {
      mockCollection.findOne.mockResolvedValue(null); // User not found initially

      const result = await deleteUserProfile(mockReq);

      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
      expect(auth0Util.deleteAuth0User).not.toHaveBeenCalled();
      expect(redisUtil.invalidateCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 404 if DB deletion returns deletedCount 0', async () => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc); // Found initially
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 }); // But delete fails

      const result = await deleteUserProfile(mockReq);

      expect(mockCollection.deleteOne).toHaveBeenCalled();
      // Should still attempt Auth0 delete even if DB delete fails? Current code does.
      expect(auth0Util.deleteAuth0User).toHaveBeenCalledWith(mockUserData.sub);
      expect(redisUtil.invalidateCache).toHaveBeenCalled(); // Caches invalidated based on initial find
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User found but could not be deleted from database',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB deletion fails', async () => {
      const dbError = new Error('DB delete failed');
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      mockCollection.deleteOne.mockRejectedValue(dbError);

      const result = await deleteUserProfile(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if Auth0 deletion fails', async () => {
      const auth0Error = new Error('Auth0 delete failed');
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 }); // DB delete succeeds
      auth0Util.deleteAuth0User.mockRejectedValue(auth0Error); // Auth0 delete fails

      const result = await deleteUserProfile(mockReq);

      // Should still return 500 even if DB delete succeeded
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- getRecentUserData Tests ---
  describe('getRecentUserData', () => {
    const mockRecentData = [
      {
        _id: new ObjectId('dataId1'),
        userId: mockUserDoc._id,
        storeId: new ObjectId('store1'),
        dataType: 'purchase',
        timestamp: new Date(),
        entries: [{ timestamp: new Date(), items: [{ name: 'Laptop', category: '102' }] }],
      },
      {
        _id: new ObjectId('dataId2'),
        userId: mockUserDoc._id,
        storeId: new ObjectId('store2'),
        dataType: 'search',
        timestamp: new Date(Date.now() - 86400000),
        entries: [{ timestamp: new Date(Date.now() - 86400000), query: 'smartphone' }],
      },
    ];

    beforeEach(() => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc); // Find the user
      mockCollection.toArray.mockResolvedValue(mockRecentData); // Mock the find()...toArray() result
      mockReq.query = { limit: '10', page: '1' }; // Default query params
    });

    it('should retrieve recent user data successfully', async () => {
      const result = await getRecentUserData(mockReq); // Call with default params

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { _id: 1 } },
      );
      expect(mockDb.collection).toHaveBeenCalledWith('userData');
      expect(mockCollection.find).toHaveBeenCalledWith({ userId: mockUserDoc._id }); // Base query
      expect(mockCollection.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockCollection.skip).toHaveBeenCalledWith(0);
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
      expect(mockCollection.project).toHaveBeenCalled();
      expect(mockCollection.toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, expect.any(Array));
      expect(result.code).toBe(200);
      expect(result.payload.length).toBe(2);
      expect(result.payload[0]).toEqual(
        expect.objectContaining({
          _id: 'dataId1',
          storeId: 'store1',
          dataType: 'purchase',
          details: expect.arrayContaining([expect.objectContaining({ items: expect.any(Array) })]),
        }),
      );
    });

    it('should apply filters correctly (dataType, storeId, date, searchTerm)', async () => {
      mockReq.query = {
        limit: '5',
        page: '2',
        dataType: 'purchase',
        storeId: 'store1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        searchTerm: 'Laptop',
      };
      const expectedSkip = (2 - 1) * 5;

      await getRecentUserData(
        mockReq,
        5,
        2,
        'purchase',
        'store1',
        '2024-01-01',
        '2024-12-31',
        'Laptop',
      );

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserDoc._id,
          dataType: 'purchase',
          storeId: new ObjectId('store1'), // Ensure ObjectId is used if storeId is ObjectId
          timestamp: { $gte: new Date('2024-01-01'), $lte: new Date('2024-12-31') },
          $or: expect.any(Array), // For searchTerm
        }),
      );
      expect(mockCollection.skip).toHaveBeenCalledWith(expectedSkip);
      expect(mockCollection.limit).toHaveBeenCalledWith(5);
    });

    it('should return 404 if user not found', async () => {
      mockCollection.findOne.mockResolvedValue(null); // User not found

      const result = await getRecentUserData(mockReq);

      expect(mockCollection.find).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      mockCollection.toArray.mockRejectedValue(new Error('DB find failed')); // Fail the find operation

      const result = await getRecentUserData(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- getSpendingAnalytics Tests ---
  describe('getSpendingAnalytics', () => {
    const mockAggregationResult = [
      { month: '2024-01', spending: { 101: 500, 302: 50 } },
      { month: '2024-02', spending: { 101: 600 } },
    ];

    beforeEach(() => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc); // Find the user
      mockCollection.aggregate().toArray.mockResolvedValue(mockAggregationResult); // Mock aggregation result
      mockReq.query = {}; // Default no date filters
    });

    it('should retrieve spending analytics successfully', async () => {
      const result = await getSpendingAnalytics(mockReq);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { _id: 1 } },
      );
      expect(TaxonomyService.getTaxonomyCategories).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('userData');
      expect(mockCollection.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: { userId: mockUserDoc._id, dataType: 'purchase' } },
          // ... other stages
        ]),
      );
      expect(mockCollection.aggregate().toArray).toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.arrayContaining([
          expect.objectContaining({
            month: '2024-01',
            spending: { Smartphones: 500, Kitchen: 50 },
          }), // Check category name mapping
          expect.objectContaining({ month: '2024-02', spending: { Smartphones: 600 } }),
        ]),
      );
      expect(result.code).toBe(200);
    });

    it('should apply date filters to aggregation pipeline', async () => {
      mockReq.query = { startDate: '2024-02-01', endDate: '2024-02-29' };

      await getSpendingAnalytics(mockReq);

      const aggregateCall = mockCollection.aggregate.mock.calls[0][0]; // Get the pipeline array
      const dateMatchStage = aggregateCall.find(
        (stage) => stage.$match && stage.$match['entries.timestamp'],
      );

      expect(dateMatchStage).toBeDefined();
      expect(dateMatchStage.$match['entries.timestamp']).toEqual({
        $gte: new Date('2024-02-01'),
        $lte: new Date('2024-02-29'),
      });
    });

    it('should return 404 if user not found', async () => {
      mockCollection.findOne.mockResolvedValue(null); // User not found

      const result = await getSpendingAnalytics(mockReq);

      expect(mockCollection.aggregate).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if taxonomy fetch fails', async () => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      TaxonomyService.getTaxonomyCategories.mockResolvedValue({
        code: 500,
        payload: { message: 'Taxonomy DB error' },
      }); // Simulate taxonomy failure

      const result = await getSpendingAnalytics(mockReq);

      expect(TaxonomyService.getTaxonomyCategories).toHaveBeenCalled();
      expect(mockCollection.aggregate).not.toHaveBeenCalled(); // Should fail before aggregation
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      }); // Generic error expected
      expect(result.code).toBe(500);
    });

    it('should return 500 if DB aggregation fails', async () => {
      mockCollection.findOne.mockResolvedValue(mockUserDoc);
      mockCollection.aggregate().toArray.mockRejectedValue(new Error('Aggregation failed')); // Fail aggregation

      const result = await getSpendingAnalytics(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });
});
