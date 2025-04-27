const { checkExistingRegistration } = require('../../../utils/helperUtil');
const mongoUtil = require('../../../utils/mongoUtil');

// Mock mongoUtil
jest.mock('../../../utils/mongoUtil');

describe('Utils - helperUtil', () => {
  let mockDb;
  let mockUsersCollection;
  let mockStoresCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Collections
    mockUsersCollection = {
      findOne: jest.fn(),
    };
    mockStoresCollection = {
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'users') return mockUsersCollection;
        if (name === 'stores') return mockStoresCollection;
        throw new Error(`Unexpected collection requested: ${name}`);
      }),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);
  });

  describe('checkExistingRegistration', () => {
    const testAuth0Id = 'auth0|test123';

    it('should return { exists: true, type: "user" } if user exists', async () => {
      mockUsersCollection.findOne.mockResolvedValue({ _id: 'userId', auth0Id: testAuth0Id });
      mockStoresCollection.findOne.mockResolvedValue(null); // Ensure stores is checked but returns null

      const result = await checkExistingRegistration(testAuth0Id);

      expect(mongoUtil.getDB).toHaveBeenCalledTimes(1);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(mockDb.collection).not.toHaveBeenCalledWith('stores'); // Should short-circuit
      expect(mockStoresCollection.findOne).not.toHaveBeenCalled();
      expect(result).toEqual({ exists: true, type: 'user' });
    });

    it('should return { exists: true, type: "store" } if store exists and user does not', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      mockStoresCollection.findOne.mockResolvedValue({ _id: 'storeId', auth0Id: testAuth0Id });

      const result = await checkExistingRegistration(testAuth0Id);

      expect(mongoUtil.getDB).toHaveBeenCalledTimes(1);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(result).toEqual({ exists: true, type: 'store' });
    });

    it('should return { exists: false } if neither user nor store exists', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);
      mockStoresCollection.findOne.mockResolvedValue(null);

      const result = await checkExistingRegistration(testAuth0Id);

      expect(mongoUtil.getDB).toHaveBeenCalledTimes(1);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(result).toEqual({ exists: false });
    });

    it('should throw error if users collection query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockUsersCollection.findOne.mockRejectedValue(dbError);

      await expect(checkExistingRegistration(testAuth0Id)).rejects.toThrow(dbError);

      expect(mongoUtil.getDB).toHaveBeenCalledTimes(1);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(mockDb.collection).not.toHaveBeenCalledWith('stores');
    });

    it('should throw error if stores collection query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockUsersCollection.findOne.mockResolvedValue(null); // User check succeeds (returns null)
      mockStoresCollection.findOne.mockRejectedValue(dbError);

      await expect(checkExistingRegistration(testAuth0Id)).rejects.toThrow(dbError);

      expect(mongoUtil.getDB).toHaveBeenCalledTimes(1);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockUsersCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
      expect(mockDb.collection).toHaveBeenCalledWith('stores');
      expect(mockStoresCollection.findOne).toHaveBeenCalledWith({ auth0Id: testAuth0Id });
    });
  });
});
