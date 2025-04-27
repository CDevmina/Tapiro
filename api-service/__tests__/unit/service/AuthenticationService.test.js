const {
  registerUser,
  registerStore,
  getUserMetadata: getAuth0UserMetadata,
} = require('../../../service/AuthenticationService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const helperUtil = require('../../../utils/helperUtil');
const writer = require('../../../utils/writer');
const auth0Util = require('../../../utils/auth0Util');
const authUtil = require('../../../utils/authUtil');
const { CACHE_KEYS, CACHE_TTL } = require('../../../utils/cacheConfig');

// Mock dependencies
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/helperUtil');
jest.mock('../../../utils/writer');
jest.mock('../../../utils/auth0Util');
jest.mock('../../../utils/authUtil');

describe('AuthenticationService - Unit Tests', () => {
  let mockDb;
  let mockCollection;
  let mockReq;
  let mockBody;
  let mockUserData;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock MongoDB collection methods
    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mockUserId' }),
      createIndex: jest.fn().mockResolvedValue('username_1'),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Setup mock Redis
    redisUtil.setCache.mockResolvedValue('OK');
    redisUtil.getCache.mockResolvedValue(null); // Default: cache miss

    // Setup mock Auth0 utils
    auth0Util.assignUserRole.mockResolvedValue({});
    auth0Util.linkAccounts.mockResolvedValue({});
    auth0Util.updateUserMetadata.mockResolvedValue({});
    auth0Util.getUserMetadata.mockResolvedValue({ app_metadata: { registrationType: 'user' } }); // Mock for the service's getUserMetadata

    // Setup mock Auth utils
    mockUserData = {
      sub: 'auth0|12345',
      email: 'test@example.com',
      nickname: 'testuser',
      phone_number: '1234567890',
    };
    authUtil.getUserData.mockResolvedValue(mockUserData);

    // Setup mock Helper utils
    helperUtil.checkExistingRegistration.mockResolvedValue({ exists: false });

    // Setup mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Setup mock request and body
    mockReq = {
      headers: {
        authorization: 'Bearer mockToken',
      },
      // Simulate middleware adding user data
      user: mockUserData,
    };
    mockBody = {
      preferences: [{ category: '101', score: 0.8 }],
      dataSharingConsent: true,
      allowInference: true,
      gender: 'male',
      incomeBracket: '50k-100k',
      country: 'US',
      age: 30,
    };
  });

  // --- registerUser Tests ---
  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const result = await registerUser(mockReq, mockBody);

      expect(helperUtil.checkExistingRegistration).toHaveBeenCalledWith(mockUserData.sub);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockUserData.email }); // Check email first
      expect(mockCollection.findOne).toHaveBeenCalledWith({ username: mockUserData.nickname }); // Then check username
      expect(auth0Util.assignUserRole).toHaveBeenCalledWith(mockUserData.sub, 'user');
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ username: 1 }, { unique: true });
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      const insertedUser = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedUser.auth0Id).toBe(mockUserData.sub);
      expect(insertedUser.email).toBe(mockUserData.email);
      expect(insertedUser.username).toBe(mockUserData.nickname);
      expect(insertedUser.demographicData.gender).toBe(mockBody.gender);
      expect(insertedUser.privacySettings.allowInference).toBe(mockBody.allowInference);
      expect(insertedUser.preferences).toEqual(mockBody.preferences);
      expect(redisUtil.setCache).toHaveBeenCalledTimes(2); // User data + preferences
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
        expect.any(String), // Don't need to match exact stringified object here
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.PREFERENCES}${mockUserData.sub}`,
        expect.any(String),
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(auth0Util.updateUserMetadata).toHaveBeenCalledWith(mockUserData.sub, {
        registrationType: 'user',
        registrationComplete: true,
      });
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        201,
        expect.objectContaining({ userId: 'mockUserId' }),
      );
      expect(result.code).toBe(201);
    });

    it('should return 409 if user is already registered', async () => {
      helperUtil.checkExistingRegistration.mockResolvedValue({ exists: true, type: 'user' });

      const result = await registerUser(mockReq, mockBody);

      expect(helperUtil.checkExistingRegistration).toHaveBeenCalledWith(mockUserData.sub);
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(409, {
        code: 409,
        message: 'This account is already registered as a user',
      });
      expect(result.code).toBe(409);
    });

    it('should return 409 if username is taken', async () => {
      // Mock email check passes, username check fails
      mockCollection.findOne
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce({ username: 'testuser', auth0Id: 'auth0|otheruser' }); // Username check

      const result = await registerUser(mockReq, mockBody);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
      expect(mockCollection.findOne).toHaveBeenCalledWith({ username: mockUserData.nickname });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(409, {
        code: 409,
        message: 'Username already taken',
      });
      expect(result.code).toBe(409);
    });

    it('should link accounts and return 200 if email exists with different auth0Id', async () => {
      const existingUser = {
        _id: 'existingUserId',
        auth0Id: 'auth0|existing',
        email: mockUserData.email,
        username: 'existinguser',
        // ... other fields
      };
      mockCollection.findOne.mockResolvedValueOnce(existingUser); // Email check finds existing user

      const result = await registerUser(mockReq, mockBody);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
      expect(auth0Util.linkAccounts).toHaveBeenCalledWith(existingUser.auth0Id, mockUserData.sub);
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.USER_DATA}${mockUserData.sub}`,
        JSON.stringify(existingUser),
        { EX: CACHE_TTL.USER_DATA },
      );
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        ...existingUser,
        message: 'Account linked successfully',
        accountLinked: true,
      });
      expect(result.code).toBe(200);
    });

    it('should return 400 if account linking fails', async () => {
      const existingUser = { auth0Id: 'auth0|existing', email: mockUserData.email };
      mockCollection.findOne.mockResolvedValueOnce(existingUser); // Email check
      const linkError = new Error('Linking failed');
      auth0Util.linkAccounts.mockRejectedValue(linkError);

      const result = await registerUser(mockReq, mockBody);

      expect(auth0Util.linkAccounts).toHaveBeenCalledWith(existingUser.auth0Id, mockUserData.sub);
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(400, {
        code: 400,
        message: 'Failed to link accounts. Please contact support.',
        details: linkError.message,
      });
      expect(result.code).toBe(400);
    });

    it('should return 500 if role assignment fails', async () => {
      const roleError = new Error('Role assignment failed');
      auth0Util.assignUserRole.mockRejectedValue(roleError);

      const result = await registerUser(mockReq, mockBody);

      expect(auth0Util.assignUserRole).toHaveBeenCalledWith(mockUserData.sub, 'user');
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Failed to assign role',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if database insertion fails', async () => {
      const dbError = new Error('DB insert failed');
      mockCollection.insertOne.mockRejectedValue(dbError);

      const result = await registerUser(mockReq, mockBody);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled(); // Should fail before caching
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });

    // Add more tests for edge cases: missing optional body fields, allowInference false, etc.
  });

  // --- registerStore Tests ---
  describe('registerStore', () => {
    beforeEach(() => {
      // Specific setup for store tests
      mockReq.user.sub = 'auth0|storeowner'; // Different user
      mockBody = {
        name: 'Test Store',
        address: '123 Main St',
        webhooks: ['http://example.com/hook'],
      };
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mockStoreId' });
      mongoUtil.getDB().collection.mockReturnValue(mockCollection); // Ensure it uses the store collection mock
    });

    it('should register a new store successfully', async () => {
      const result = await registerStore(mockReq, mockBody);

      expect(helperUtil.checkExistingRegistration).toHaveBeenCalledWith(mockReq.user.sub);
      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockReq.user.email }); // Check email
      expect(auth0Util.assignUserRole).toHaveBeenCalledWith(mockReq.user.sub, 'store');
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      const insertedStore = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedStore.auth0Id).toBe(mockReq.user.sub);
      expect(insertedStore.name).toBe(mockBody.name);
      expect(insertedStore.email).toBe(mockReq.user.email);
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockReq.user.sub}`,
        expect.any(String),
        { EX: CACHE_TTL.STORE_DATA },
      );
      expect(auth0Util.updateUserMetadata).toHaveBeenCalledWith(mockReq.user.sub, {
        registrationType: 'store',
        registrationComplete: true,
      });
      expect(writer.respondWithCode).toHaveBeenCalledWith(
        201,
        expect.objectContaining({ storeId: 'mockStoreId' }),
      );
      expect(result.code).toBe(201);
    });

    it('should return 409 if user is already registered', async () => {
      helperUtil.checkExistingRegistration.mockResolvedValue({ exists: true, type: 'store' });

      const result = await registerStore(mockReq, mockBody);

      expect(helperUtil.checkExistingRegistration).toHaveBeenCalledWith(mockReq.user.sub);
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(409, {
        code: 409,
        message: 'This account is already registered as a store',
      });
      expect(result.code).toBe(409);
    });

    it('should link accounts and return 200 if email exists with different auth0Id', async () => {
      const existingStore = {
        _id: 'existingStoreId',
        auth0Id: 'auth0|existingStore',
        email: mockReq.user.email,
        name: 'Existing Store',
      };
      mockCollection.findOne.mockResolvedValueOnce(existingStore); // Email check

      const result = await registerStore(mockReq, mockBody);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockReq.user.email });
      expect(auth0Util.linkAccounts).toHaveBeenCalledWith(existingStore.auth0Id, mockReq.user.sub);
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        `${CACHE_KEYS.STORE_DATA}${mockReq.user.sub}`,
        JSON.stringify(existingStore),
        { EX: CACHE_TTL.STORE_DATA },
      );
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, {
        ...existingStore,
        message: 'Account linked successfully',
        accountLinked: true,
      });
      expect(result.code).toBe(200);
    });

    // Add tests for linking failure, role assignment failure, DB failure similar to registerUser
  });

  // --- getUserMetadata Tests ---
  describe('getUserMetadata', () => {
    it('should retrieve user metadata successfully', async () => {
      const mockMetadata = {
        app_metadata: { registrationType: 'user', registrationComplete: true },
      };
      auth0Util.getUserMetadata.mockResolvedValue(mockMetadata); // Specific mock for this test

      const result = await getAuth0UserMetadata(mockReq); // Use the imported name

      expect(authUtil.getUserData).not.toHaveBeenCalled(); // Should use req.user
      expect(auth0Util.getUserMetadata).toHaveBeenCalledWith(mockReq.user.sub);
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, { metadata: mockMetadata });
      expect(result.code).toBe(200);
    });

    it('should retrieve user metadata successfully using token if req.user is missing', async () => {
      const mockMetadata = { app_metadata: { registrationType: 'store' } };
      auth0Util.getUserMetadata.mockResolvedValue(mockMetadata);
      delete mockReq.user; // Remove user from req to force token lookup

      const result = await getAuth0UserMetadata(mockReq);

      expect(authUtil.getUserData).toHaveBeenCalledWith('mockToken');
      expect(auth0Util.getUserMetadata).toHaveBeenCalledWith(mockUserData.sub); // Uses sub from looked-up user data
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, { metadata: mockMetadata });
      expect(result.code).toBe(200);
    });

    it('should return 500 if getUserMetadata fails', async () => {
      const metaError = new Error('Failed to get metadata');
      auth0Util.getUserMetadata.mockRejectedValue(metaError);

      const result = await getAuth0UserMetadata(mockReq);

      expect(auth0Util.getUserMetadata).toHaveBeenCalledWith(mockReq.user.sub);
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error',
      });
      expect(result.code).toBe(500);
    });
  });
});
