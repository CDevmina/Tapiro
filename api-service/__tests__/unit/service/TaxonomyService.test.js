const { getTaxonomyCategories } = require('../../../service/TaxonomyService');
const mongoUtil = require('../../../utils/mongoUtil');
const redisUtil = require('../../../utils/redisUtil');
const writer = require('../../../utils/writer');
const { CACHE_KEYS, CACHE_TTL } = require('../../../utils/cacheConfig');

// Mock dependencies
jest.mock('../../../utils/mongoUtil');
jest.mock('../../../utils/redisUtil');
jest.mock('../../../utils/writer');

describe('TaxonomyService - Unit Tests', () => {
  let mockDb;
  let mockCollection;
  let mockTaxonomyDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MongoDB Collection
    mockCollection = {
      findOne: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mongoUtil.getDB.mockReturnValue(mockDb);

    // Mock Redis
    redisUtil.getCache.mockResolvedValue(null); // Default cache miss
    redisUtil.setCache.mockResolvedValue('OK');

    // Mock Writer
    writer.respondWithCode.mockImplementation((code, payload) => ({ code, payload }));

    // Mock Taxonomy Document from DB
    mockTaxonomyDoc = {
      _id: 'taxonomyId123',
      current: true,
      data: {
        version: '1.1',
        categories: [
          { id: '100', name: 'Electronics', attributes: [{ name: 'brand', type: 'string' }] },
          {
            id: '101',
            name: 'Smartphones',
            parentId: '100',
            attributes: [{ name: 'screen_size', type: 'number' }],
          },
          { id: '200', name: 'Clothing' },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // --- getTaxonomyCategories Tests ---
  describe('getTaxonomyCategories', () => {
    it('should return taxonomy from cache if available', async () => {
      redisUtil.getCache.mockResolvedValue(JSON.stringify(mockTaxonomyDoc));

      const result = await getTaxonomyCategories();

      expect(redisUtil.getCache).toHaveBeenCalledWith(CACHE_KEYS.TAXONOMY);
      expect(mockCollection.findOne).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockTaxonomyDoc);
      expect(result.code).toBe(200);
    });

    it('should return taxonomy from DB if not in cache', async () => {
      mockCollection.findOne.mockResolvedValue(mockTaxonomyDoc);
      const expectedTTL = CACHE_TTL.TAXONOMY || CACHE_TTL.LONG || 3600 * 24;

      const result = await getTaxonomyCategories();

      expect(redisUtil.getCache).toHaveBeenCalledWith(CACHE_KEYS.TAXONOMY);
      expect(mockDb.collection).toHaveBeenCalledWith('taxonomy');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ current: true });
      expect(redisUtil.setCache).toHaveBeenCalledWith(
        CACHE_KEYS.TAXONOMY,
        JSON.stringify(mockTaxonomyDoc),
        { EX: expectedTTL },
      );
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockTaxonomyDoc);
      expect(result.code).toBe(200);
    });

    it('should return 404 if taxonomy not found in DB', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await getTaxonomyCategories();

      expect(redisUtil.getCache).toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(redisUtil.setCache).not.toHaveBeenCalled();
      expect(writer.respondWithCode).toHaveBeenCalledWith(404, {
        code: 404,
        message: 'Taxonomy data not found in database',
      });
      expect(result.code).toBe(404);
    });

    it('should return 500 if DB query fails', async () => {
      const dbError = new Error('DB connection failed');
      mockCollection.findOne.mockRejectedValue(dbError);

      const result = await getTaxonomyCategories();

      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error retrieving taxonomy',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if Redis getCache fails', async () => {
      const redisError = new Error('Redis connection failed');
      redisUtil.getCache.mockRejectedValue(redisError);
      // Mock DB findOne to ensure it's not called
      mockCollection.findOne.mockResolvedValue(mockTaxonomyDoc);

      const result = await getTaxonomyCategories();

      expect(redisUtil.getCache).toHaveBeenCalledWith(CACHE_KEYS.TAXONOMY);
      expect(mockCollection.findOne).not.toHaveBeenCalled(); // Should fail before DB call
      expect(writer.respondWithCode).toHaveBeenCalledWith(500, {
        code: 500,
        message: 'Internal server error retrieving taxonomy',
      });
      expect(result.code).toBe(500);
    });

    it('should return 500 if Redis setCache fails (but still return data)', async () => {
      const redisError = new Error('Redis write failed');
      redisUtil.setCache.mockRejectedValue(redisError);
      mockCollection.findOne.mockResolvedValue(mockTaxonomyDoc); // DB fetch succeeds

      const result = await getTaxonomyCategories();

      expect(redisUtil.getCache).toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(redisUtil.setCache).toHaveBeenCalled(); // Attempted to set cache
      // Should still return 200 with data despite cache failure
      expect(writer.respondWithCode).toHaveBeenCalledWith(200, mockTaxonomyDoc);
      expect(result.code).toBe(200);
      // Optionally, check logs for the error message if your service logs it
    });
  });
});
