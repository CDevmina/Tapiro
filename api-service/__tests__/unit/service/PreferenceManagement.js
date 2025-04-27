const { ObjectId } = require('mongodb');
const {
  getUserOwnPreferences,
  updateUserPreferences,
  optOutFromStore,
  optInToStore,
  getStoreConsentLists,
} = require('../../../service/PreferenceManagementService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const authUtil = require('../../../utils/authUtil');
const writer = require('../../../utils/writer');
const TaxonomyService = require('../../../service/TaxonomyService');
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
jest.mock('../../../utils/writer');
jest.mock('../../../service/TaxonomyService'); // Mock the entire service

describe('PreferenceManagementService - Unit Tests', () => {
  let mockDb;
  let mockUsersCollection;
  let mockStoresCollection;
  let mockUserData;
  let mockReq;
  let mockBody;
  let mockUserDoc;
  let mockStoreDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Collections
    mockUsersCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }), // Default success
    };
    mockStoresCollection = {
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'users') return mockUsersCollection;
        if (name === 'stores') return mockStoresCollection;
        return { findOne: jest.fn(), updateOne: jest.fn() }; // Default mock for other collections
      }),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis
    redisUtil.getCache.mockResolvedValue(null); // Default cache miss
    redisUtil.setCache.mockResolvedValue('OK');
    redisUtil.invalidateCache.mockResolvedValue(1);

    // Mock Auth Utils
    mockUserData = {
      sub: 'auth0|userPref123',
      email: 'userpref@example.com',
    };
    authUtil.getUserData.mockResolvedValue(mockUserData);

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock Taxonomy Service
    TaxonomyService.getTaxonomyCategories.mockResolvedValue({
      code: 200,
      payload: {
        data: {
          categories: [
            { id: '101', name: 'Smartphones' },
            { id: '201', name: 'Clothing' },
            { id: '301', name: 'Furniture' },
          ],
        },
      },
    });

    // Mock Request
    mockReq = {
      headers: { authorization: 'Bearer mockToken' },
      user: mockUserData, // Assume middleware added user
    };

    // Mock User Document from DB
    mockUserDoc = {
      _id: new ObjectId('mockUserIdPref'),
      auth0Id: mockUserData.sub,
      username: 'userpref',
      email: mockUserData.email,
      preferences: [{ category: '101', score: 0.8 }],
      privacySettings: {
        dataSharingConsent: true,
        optInStores: ['storeId1'],
        optOutStores: ['storeId2'],
      },
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    // Mock Store Document
    mockStoreDoc = {
      _id: new ObjectId('storeId1'),
      name: 'Test Store One',
    };
  });

  // --- getUserOwnPreferences Tests ---
  describe('getUserOwnPreferences', () => {
    it('should return user preferences from cache if available', async () => {
      const cachedPrefs = {
        userId: mockUserDoc._id.toString(),
        preferences: mockUserDoc.preferences,
        updatedAt: mockUserDoc.updatedAt,
      };
      redisUtil.getCache.mockResolvedValue(JSON.stringify(cachedPrefs));

      const result = await getUserOwnPreferences(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      expect(mockUsersCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, cachedPrefs);
      expect(result.code).toBe(200);
      expect(result.payload.privacySettings).toBeUndefined(); // Ensure privacy settings are excluded
    });

    it('should return user preferences from DB if not in cache', async () => {
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc);
      const expectedResponse = {
        userId: mockUserDoc._id.toString(),
        preferences: mockUserDoc.preferences,
        updatedAt: mockUserDoc.updatedAt,
      };

      const result = await getUserOwnPreferences(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        { projection: { _id: 1, preferences: 1, updatedAt: 1 } },
      );
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
        JSON.stringify(expectedResponse),
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, expectedResponse);
      expect(result.code).toBe(200);
      expect(result.payload.privacySettings).toBeUndefined();
    });

    it('should return 404 if user not found in DB', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);

      const result = await getUserOwnPreferences(mockReq);

      expect(redisUtil.getCache).toHaveBeenCalled();
      expect(mockUsersCollection.findOne).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockUsersCollection.findOne.mockRejectedValue(dbError);

      const result = await getUserOwnPreferences(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- updateUserPreferences Tests ---
  describe('updateUserPreferences', () => {
    beforeEach(() => {
      mockBody = {
        preferences: [
          { category: '201', score: 0.9, attributes: { color: 'blue' } },
          { category: '301', score: 0.5 },
        ],
      };
      // Mock findOne to return the user before update
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc);
      // Mock findOne again for the fetch *after* update
      mockUsersCollection.findOne.mockResolvedValueOnce(mockUserDoc).mockResolvedValueOnce({
        ...mockUserDoc,
        preferences: mockBody.preferences,
        updatedAt: new Date('2024-01-01T11:00:00Z'), // Simulate updated timestamp
      });
    });

    it('should update user preferences successfully', async () => {
      const result = await updateUserPreferences(mockReq, mockBody);

      expect(mockUsersCollection.findOne).toHaveBeenCalledTimes(2); // Once before, once after update
      expect(TaxonomyService.getTaxonomyCategories).toHaveBeenCalled(); // For validation
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        {
          $set: {
            preferences: mockBody.preferences,
            updatedAt: expect.any(Date),
          },
        },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      // Check store-specific cache invalidation
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:storeId1`,
      );
      // Check cache update
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
        expect.stringContaining('"category":"201"'), // Check new prefs are cached
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          preferences: mockBody.preferences,
          updatedAt: new Date('2024-01-01T11:00:00Z'), // Check updated timestamp
        }),
      );
      expect(result.code).toBe(200);
    });

    it('should clear preferences if preferences array is empty', async () => {
      mockBody.preferences = [];
      // Adjust second findOne mock
      mockUsersCollection.findOne
        .mockResolvedValueOnce(mockUserDoc)
        .mockResolvedValueOnce({ ...mockUserDoc, preferences: [], updatedAt: new Date() });

      await updateUserPreferences(mockReq, mockBody);

      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        { $set: { preferences: [], updatedAt: expect.any(Date) } },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ preferences: [] }),
      );
    });

    it('should return 400 if preferences is not an array', async () => {
      mockBody.preferences = { category: '101', score: 0.5 }; // Invalid format
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Preferences must be an array.',
      });
      expect(result.code).toBe(400);
    });

    it('should return 400 if preference item has invalid format', async () => {
      mockBody.preferences = [{ category: '101' }]; // Missing score
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        400,
        expect.objectContaining({
          message: expect.stringContaining('Invalid preference item format'),
        }),
      );
      expect(result.code).toBe(400);
    });

    it('should return 400 if preference score is out of range', async () => {
      mockBody.preferences = [{ category: '101', score: 1.5 }]; // Invalid score
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        400,
        expect.objectContaining({
          message: expect.stringContaining('Invalid preference item format or score range'),
        }),
      );
      expect(result.code).toBe(400);
    });

    it('should return 400 if preference attributes format is invalid', async () => {
      mockBody.preferences = [{ category: '101', score: 0.5, attributes: ['blue'] }]; // Invalid attributes (array)
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        400,
        expect.objectContaining({
          message: expect.stringContaining("Invalid 'attributes' format"),
        }),
      );
      expect(result.code).toBe(400);
    });

    it('should return 400 if preference category ID is invalid', async () => {
      mockBody.preferences = [{ category: '999', score: 0.5 }]; // Invalid category
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Invalid category ID in preferences: 999',
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if taxonomy fetch fails during validation', async () => {
      TaxonomyService.getTaxonomyCategories.mockResolvedValue({
        code: 500,
        payload: { message: 'DB error' },
      }); // Simulate failure
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Could not load taxonomy for validation.',
      });
      expect(result.code).toBe(500);
    });

    it('should return 404 if user not found', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null); // User not found
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockUsersCollection.updateOne.mockRejectedValue(dbError);
      const result = await updateUserPreferences(mockReq, mockBody);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- optOutFromStore Tests ---
  describe('optOutFromStore', () => {
    const storeIdToOptOut = 'storeId1'; // User is currently opted-in to this store

    beforeEach(() => {
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc);
      mockStoresCollection.findOne.mockResolvedValue(mockStoreDoc); // Store exists
    });

    it('should opt user out from store successfully', async () => {
      const result = await optOutFromStore(mockReq, storeIdToOptOut);

      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(ObjectId).toHaveBeenCalledWith(storeIdToOptOut);
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ _id: expect.any(Object) });
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        {
          $pull: { 'privacySettings.optInStores': storeIdToOptOut },
          $addToSet: { 'privacySettings.optOutStores': storeIdToOptOut },
          $set: { updatedAt: expect.any(Date) },
        },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:${storeIdToOptOut}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(204);
      expect(result.code).toBe(204);
    });

    it('should return 404 if user not found', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      const result = await optOutFromStore(mockReq, storeIdToOptOut);
      expect(mockStoresCollection.findOne).not.toHaveBeenCalled();
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 400 if store ID format is invalid', async () => {
      const invalidStoreId = 'invalid-format';
      ObjectId.mockImplementationOnce(() => {
        throw new Error('Invalid format');
      });
      const result = await optOutFromStore(mockReq, invalidStoreId);
      expect(mockStoresCollection.findOne).not.toHaveBeenCalled();
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Invalid store ID format',
      });
      expect(result.code).toBe(400);
    });

    it('should return 404 if store not found', async () => {
      mockStoresCollection.findOne.mockResolvedValue(null); // Store doesn't exist
      const result = await optOutFromStore(mockReq, storeIdToOptOut);
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Store not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB update fails', async () => {
      const dbError = new Error('DB update failed');
      mockUsersCollection.updateOne.mockRejectedValue(dbError);
      const result = await optOutFromStore(mockReq, storeIdToOptOut);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });

  // --- optInToStore Tests ---
  describe('optInToStore', () => {
    const storeIdToOptIn = 'storeId2'; // User is currently opted-out from this store

    beforeEach(() => {
      mockUsersCollection.findOne.mockResolvedValue(mockUserDoc);
      mockStoresCollection.findOne.mockResolvedValue({
        _id: new ObjectId(storeIdToOptIn),
        name: 'Store Two',
      }); // Store exists
    });

    it('should opt user in to store successfully', async () => {
      const result = await optInToStore(mockReq, storeIdToOptIn);

      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: mockUserData.sub });
      expect(ObjectId).toHaveBeenCalledWith(storeIdToOptIn);
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ _id: expect.any(Object) });
      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockUserDoc._id },
        {
          $addToSet: { 'privacySettings.optInStores': storeIdToOptIn },
          $pull: { 'privacySettings.optOutStores': storeIdToOptIn },
          $set: { updatedAt: expect.any(Date) },
        },
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_PREFERENCES}${mockUserDoc._id}:${storeIdToOptIn}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
      );
      expect(redisUtil.invalidateCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(204);
      expect(result.code).toBe(204);
    });

    // Add tests for 404 user, 400 invalid storeId, 404 store, 500 DB error (similar to optOut)
  });

  // --- getStoreConsentLists Tests ---
  describe('getStoreConsentLists', () => {
    it('should return opt-in and opt-out lists successfully', async () => {
      mockUsersCollection.findOne.mockResolvedValue({
        privacySettings: mockUserDoc.privacySettings, // Return only the projected fields
      });

      const result = await getStoreConsentLists(mockReq);

      expect(mockUsersCollection.findOne).toHaveBeenCalledWith(
        { auth0Id: mockUserData.sub },
        {
          projection: {
            'privacySettings.optInStores': 1,
            'privacySettings.optOutStores': 1,
            _id: 0,
          },
        },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        optInStores: mockUserDoc.privacySettings.optInStores,
        optOutStores: mockUserDoc.privacySettings.optOutStores,
      });
      expect(result.code).toBe(200);
    });

    it('should return empty lists if privacySettings or lists are missing', async () => {
      mockUsersCollection.findOne.mockResolvedValue({}); // User found, but no privacySettings field

      const result = await getStoreConsentLists(mockReq);

      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        optInStores: [],
        optOutStores: [],
      });
      expect(result.code).toBe(200);
    });

    it('should return 404 if user not found', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      const result = await getStoreConsentLists(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'User not found',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB query failed');
      mockUsersCollection.findOne.mockRejectedValue(dbError);
      const result = await getStoreConsentLists(mockReq);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });
});
