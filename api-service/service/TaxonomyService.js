const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Get Taxonomy Categories
 * Retrieves the full taxonomy structure from the MongoDB 'taxonomy' collection.
 */
exports.getTaxonomyCategories = async function () {
  // Use the correct cache key defined in cacheConfig.js
  const cacheKey = CACHE_KEYS.TAXONOMY; // Changed from TAXONOMY_FULL
  try {
    // Check cache first
    const cachedTaxonomy = await getCache(cacheKey);
    if (cachedTaxonomy) {
      console.log('Taxonomy retrieved from cache');
      // Parse and remove MongoDB _id before returning if it's not part of the defined schema response
      const taxonomyData = JSON.parse(cachedTaxonomy);
      // delete taxonomyData._id; // Optional: remove _id if not needed in response
      return respondWithCode(200, taxonomyData);
    }

    console.log('Fetching taxonomy from MongoDB');
    const db = getDB();
    // Assuming the taxonomy is stored as a single document in the 'taxonomy' collection.
    // Adjust the query if the structure is different (e.g., findOne({ _id: 'current_taxonomy' }))
    const taxonomyDoc = await db.collection('taxonomy').findOne({ current: true }); // Find the current taxonomy

    if (!taxonomyDoc) {
      return respondWithCode(404, { code: 404, message: 'Taxonomy data not found in database' });
    }

    // Cache the result - Use a longer TTL for taxonomy structure
    // Store the raw document including _id in cache
    // Use a specific TTL for taxonomy if defined, otherwise fallback or use a default
    const taxonomyTTL = CACHE_TTL.TAXONOMY || CACHE_TTL.LONG || 3600 * 24; // Example: Use TAXONOMY TTL or fallback
    await setCache(cacheKey, JSON.stringify(taxonomyDoc), { EX: taxonomyTTL });

    // Remove MongoDB _id before returning if it's not part of the defined schema response
    // delete taxonomyDoc._id; // Optional: remove _id if not needed in response
    return respondWithCode(200, taxonomyDoc);

  } catch (error) {
    console.error('Get taxonomy categories failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error retrieving taxonomy' });
  }
};