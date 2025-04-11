const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const AIService = require('../clients/AIService');
const taxonomyUtil = require('../utils/taxonomyUtil');

/**
 * Get user preferences for targeted advertising
 * Used by stores via API key authentication
 */
exports.getUserPreferences = async function (req, userId) {
  try {
    // Validate storeId is set by the API key middleware
    if (!req.storeId) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid API key',
      });
    }

    const db = getDB();

    // Try cache first using preference-specific cache key with constants
    const cacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userId}:${req.storeId}`;
    const cachedPrefs = await getCache(cacheKey);
    if (cachedPrefs) {
      return respondWithCode(200, JSON.parse(cachedPrefs));
    }

    // Find user in database by email only
    const user = await db.collection('users').findOne({ email: userId });

    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Check for consent
    if (!user.privacySettings?.dataSharingConsent) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
    }

    // Check if user has explicitly opted out from this store
    const isOptedOut = user.privacySettings?.optOutStores?.includes(req.storeId);
    if (isOptedOut) {
      return respondWithCode(403, {
        code: 403,
        message: 'No consent: user has opted out from sharing data with this store',
      });
    }

    // Check if user has explicitly opted in to this store
    const isOptedIn = user.privacySettings?.optInStores?.includes(req.storeId);

    // Only auto opt-in if not in opt-out list (which we've already checked)
    if (!isOptedIn) {
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $addToSet: { 'privacySettings.optInStores': req.storeId },
          $set: { updatedAt: new Date() },
        },
      );
    }

    // Prepare user preferences
    const preferences = {
      userId: user._id.toString(),
      preferences: user.preferences || [],
      updatedAt: user.updatedAt || new Date(),
    };

    // Cache the preferences with standardized TTL
    await setCache(cacheKey, JSON.stringify(preferences), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, preferences);
  } catch (error) {
    console.error('Get user preferences failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Submit user data for analysis
 * Used by stores via API key authentication
 */
exports.submitUserData = async function (req, body) {
  try {
    // Validate storeId is set by the API key middleware
    if (!req.storeId) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid API key',
      });
    }

    const db = getDB();
    const { email, dataType, entries, metadata } = body;

    
    if (!Array.isArray(entries)) {
      return respondWithCode(400, {
        code: 400,
        message: 'Entries must be an array',
      });
    }

    // Only validate dataType
    if (dataType !== 'purchase' && dataType !== 'search') {
      return respondWithCode(400, {
        code: 400,
        message: 'dataType must be either "purchase" or "search"',
      });
    }

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Check user consent
    if (!user.privacySettings?.dataSharingConsent) {
      return respondWithCode(403, {
        code: 403,
        message: 'User has not provided consent for data sharing',
      });
    }

    // Check if user has explicitly opted out from this store
    const isOptedOut = user.privacySettings?.optOutStores?.includes(req.storeId);
    if (isOptedOut) {
      return respondWithCode(403, {
        code: 403,
        message: 'No consent: user has opted out from sharing data with this store',
      });
    }

    // Check if user has explicitly opted in to this store
    const isOptedIn = user.privacySettings?.optInStores?.includes(req.storeId);

    // Auto opt-in the user only if not opted out and not already opted in
    if (!isOptedIn) {
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $addToSet: { 'privacySettings.optInStores': req.storeId },
          $set: { updatedAt: new Date() },
        },
      );
    }

    // Process entries to ensure proper data types
    const processedEntries = entries.map((entry) => {
      // Convert entry timestamp to Date object
      const processedEntry = {
        ...entry,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
      };

      // Handle purchase entries
      if (dataType === 'purchase' && processedEntry.items) {
        processedEntry.items = processedEntry.items.map((item) => ({
          ...item,
          // Ensure quantity is an integer
          quantity: item.quantity ? parseInt(item.quantity) : 1,
          // Ensure price is a double/float
          price: item.price ? parseFloat(item.price) : undefined,
        }));
      }

      // Handle search entries
      if (dataType === 'search') {
        // Ensure results is an integer if present
        if (processedEntry.results) {
          processedEntry.results = parseInt(processedEntry.results);
        }
      }

      return processedEntry;
    });

    // Store data with audit fields included and properly typed data
    const result = await db.collection('userData').insertOne({
      userId: user._id, // Already an ObjectId from MongoDB
      storeId: req.storeId,
      email,
      dataType,
      entries: processedEntries, // Use the processed entries
      metadata,
      processedStatus: 'pending',
      timestamp: new Date(),
    });

    // Invalidate the preferences cache
    await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${user._id}:${req.storeId}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${user.auth0Id}`);

    // SINGLE API CALL to the AI service
    try {
      const aiResponse = await AIService.processUserData({
        email,
        data_type: dataType,
        entries,
        metadata: {
          ...metadata,
          storeId: req.storeId,
          userId: user._id.toString(),
          timestamp: new Date(),
        },
      });

      return respondWithCode(202, {
        message: 'Data accepted for processing',
        aiProcessing: aiResponse.status,
      });
    } catch (aiError) {
      console.error('AI service processing failed, but data was stored:', aiError);

      // Update status to failed
      await db
        .collection('userData')
        .updateOne({ _id: result.insertedId }, { $set: { processedStatus: 'failed' } });

      // Still return 202 since we saved the data and can process it later
      return respondWithCode(202, {
        message: 'Data accepted but AI processing delayed',
        retryScheduled: true,
      });
    }
  } catch (error) {
    console.error('Submit user data failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
