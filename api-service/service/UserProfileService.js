const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const {updateUserPhone, updateAuth0Username, deleteAuth0User } = require('../utils/auth0Util');

/**
 * Get User Profile
 * Get authenticated user's profile
 */
exports.getUserProfile = async function (req) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Try cache first using standardized cache key
    const cacheKey = `${CACHE_KEYS.USER_DATA}${userData.sub}`;
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) {
      // Ensure preferences are not included in the cached response being returned
      const userProfile = JSON.parse(cachedUser);
      delete userProfile.preferences;
      return respondWithCode(200, userProfile);
    }

    // Get from database, excluding preferences field
    const user = await db.collection('users').findOne(
      { auth0Id: userData.sub },
      { projection: { preferences: 0 } } // Exclude preferences
    );
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Cache the result (without preferences) with standardized TTL
    await setCache(cacheKey, JSON.stringify(user), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, user); // user object already excludes preferences
  } catch (error) {
    console.error('Get profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update User Profile
 * Update authenticated user's profile
 */
exports.updateUserProfile = async function (req, body) {
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const auth0UserId = userData.sub;

    // --- Local DB Username Uniqueness Check ---
    // Keep this check for your application's internal username uniqueness
    if (body.username) {
      const existingUser = await db.collection('users').findOne({
        username: body.username,
        auth0Id: { $ne: auth0UserId },
      });
      if (existingUser) {
        return respondWithCode(409, { code: 409, message: 'Username already taken in application' });
      }
    }

    // --- Auth0 Username Update ---
    // Attempt to update the Auth0 username if provided in the body.
    // Auth0 will enforce its own uniqueness rules per connection.
    if (body.username) {
      try {
        await updateAuth0Username(auth0UserId, body.username);
        // Optionally: Update nickname in metadata as well if desired
        // await updateUserMetadata(auth0UserId, { nickname: body.username });
      } catch (auth0Error) {
        // If Auth0 update fails (e.g., username exists in Auth0 connection), return an error
        // You might want to check the specific error type from auth0Error
        console.error(`Auth0 username update failed for ${auth0UserId}:`, auth0Error);
        return respondWithCode(409, { // Use 409 Conflict or appropriate code
          code: 409,
          message: 'Failed to update username with identity provider. It might already be taken.',
          // Optionally include details: details: auth0Error.message
        });
      }
    }

    // --- Phone Number Update in Auth0 ---
    if (body.phone && body.phone !== userData.phone_number) {
      try {
        await updateUserPhone(auth0UserId, body.phone);
      } catch (auth0Error) {
        // Log and continue, or return error as needed
        console.error(`Auth0 phone update failed for ${auth0UserId}:`, auth0Error);
        // return respondWithCode(500, { code: 500, message: 'Failed to update phone number with identity provider.' });
      }
    }

    // --- Database Update ---
    const updateData = {
      updatedAt: new Date(),
    };
    // Update local DB username only if Auth0 update was successful (or not attempted)
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // Only update allowed privacy settings
    if (body.privacySettings !== undefined) {
      updateData.privacySettings = {};
      if (body.privacySettings.dataSharingConsent !== undefined) {
        updateData.privacySettings.dataSharingConsent = body.privacySettings.dataSharingConsent;
      }
      if (body.privacySettings.anonymizeData !== undefined) {
        updateData.privacySettings.anonymizeData = body.privacySettings.anonymizeData;
      }
      // DO NOT update optInStores or optOutStores here
    }

    if (body.dataAccess !== undefined) updateData.dataAccess = body.dataAccess;

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: auth0UserId },
        { $set: updateData },
        { returnDocument: 'after', projection: { preferences: 0 } },
      );

    if (!result) {
      // This case might occur if the user was deleted between checks
      return respondWithCode(404, { code: 404, message: 'User not found during final update' });
    }

    // --- Cache Invalidation & Update ---
    const cacheKey = `${CACHE_KEYS.USER_DATA}${auth0UserId}`;
    await invalidateCache(cacheKey);

    // Invalidate store preferences if privacy settings changed
    if (updateData.privacySettings && result.privacySettings?.optInStores) {
       const userObjectId = result._id;
       for (const storeId of result.privacySettings.optInStores) {
         await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`);
       }
    }

    // Update cache with the new data (without preferences)
    // Note: This happens *after* invalidation, ensuring fresh data is set if needed immediately
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, result);
  } catch (error) {
    // Catch errors not handled specifically above
    console.error('Update profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error during profile update' });
  }
};

/**
 * Delete User Profile
 * Delete authenticated user's profile
 */
exports.deleteUserProfile = async function (req) {
  try {
    const db = getDB();

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Find user to get ID for cache invalidation later
    const user = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { _id: 1, privacySettings: 1 } });
     if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }
    const userObjectId = user._id;
    const userPrivacySettings = user.privacySettings;


    // Delete from database
    const deleteResult = await db.collection('users').deleteOne({ auth0Id: userData.sub });
    if (deleteResult.deletedCount === 0) {
       // This case should ideally not happen if findOne succeeded, but good practice
      return respondWithCode(404, {
        code: 404,
        message: 'User not found during deletion',
      });
    }

    // Delete from Auth0 using the utility function
    await deleteAuth0User(userData.sub); // Call the new function

    // Clear user-specific caches
    await invalidateCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`);
    await invalidateCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`);

     // Clear related store preference caches
    if (userPrivacySettings?.optInStores) {
      for (const storeId of userPrivacySettings.optInStores) {
        await invalidateCache(`${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`);
      }
    }


    return respondWithCode(204);
  } catch (error) {
    console.error('Delete profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get Recent User Data Submissions
 * Retrieves a list of recent data submissions made about the authenticated user.
 */
exports.getRecentUserData = async function (req, limit = 10, page = 1) {
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Find user to get their internal _id
    const user = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    const skip = (page - 1) * limit;

    // Query userData collection
    const recentData = await db.collection('userData')
      .find({ userId: user._id }) // Filter by the user's ObjectId
      .sort({ timestamp: -1 }) // Sort by submission time descending
      .skip(skip)
      .limit(limit)
      .project({ // Project only necessary fields for RecentUserDataEntry schema
        _id: 1,
        storeId: 1,
        dataType: 1,
        timestamp: 1, // Submission timestamp
        entryTimestamp: '$entries.timestamp', // Assuming timestamp is within entries array
        // Add simplified details if needed, e.g., item count or query string
        // details: { $cond: { if: { $eq: ['$dataType', 'purchase'] }, then: { itemCount: { $size: '$entries.items' } }, else: '$entries.query' } }
      })
      .toArray();

    // Simple transformation if needed (e.g., flatten entryTimestamp if it's an array)
    const formattedData = recentData.map(entry => ({
      ...entry,
      // If entryTimestamp is an array due to projection, take the first element
      entryTimestamp: Array.isArray(entry.entryTimestamp) ? entry.entryTimestamp[0] : entry.entryTimestamp,
      // Add placeholder for details
      details: {}
    }));


    // Caching could be added here if this data is frequently accessed
    // const cacheKey = `${CACHE_KEYS.USER_RECENT_DATA}${user._id}:${page}:${limit}`;
    // await setCache(cacheKey, JSON.stringify(formattedData), { EX: CACHE_TTL.SHORT }); // Example TTL

    return respondWithCode(200, formattedData);

  } catch (error) {
    console.error('Get recent user data failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get User Spending Analytics
 * Retrieves aggregated spending data categorized by taxonomy for the authenticated user.
 */
exports.getSpendingAnalytics = async function (req) {
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Find user to get their internal _id
    const user = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Fetch the taxonomy once to map category IDs to names
    // Use the filter { current: true } if you only want the active taxonomy
    const taxonomyDoc = await db.collection('taxonomy').findOne({ current: true }); // Or findOne({}) if 'current' flag isn't always used

    // Correctly access the categories array via taxonomyDoc.data.categories
    const categoryMap = (taxonomyDoc && taxonomyDoc.data && taxonomyDoc.data.categories)
      ? taxonomyDoc.data.categories.reduce((map, cat) => {
          map[cat.id] = cat.name;
          return map;
        }, {})
      : {}; // Default to empty map if taxonomy, data, or categories are missing


    const pipeline = [
      { $match: { userId: user._id, dataType: 'purchase' } },
      { $unwind: '$entries' },
      { $unwind: '$entries.items' },
      {
        $group: {
          _id: '$entries.items.category',
          totalSpent: {
            $sum: {
              $cond: {
                 if: { $and: [
                   { $isNumber: '$entries.items.price' },
                   { $isNumber: '$entries.items.quantity' }
                 ]},
                 then: { $multiply: ['$entries.items.price', '$entries.items.quantity'] },
                 else: { $cond: { if: { $isNumber: '$entries.items.price' }, then: '$entries.items.price', else: 0 } }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalSpent: 1
        }
      }
    ];

    const results = await db.collection('userData').aggregate(pipeline).toArray();

    // Transform results using the categoryMap (this part remains the same)
    const spendingAnalytics = results.reduce((acc, item) => {
      const categoryName = categoryMap[item.category] || item.category; // Use name from map, fallback to ID
      acc[categoryName] = (acc[categoryName] || 0) + item.totalSpent;
      return acc;
    }, {});

    // Caching could be added here
    // const cacheKey = `${CACHE_KEYS.USER_SPENDING_ANALYTICS}${user._id}`;
    // await setCache(cacheKey, JSON.stringify(spendingAnalytics), { EX: CACHE_TTL.MEDIUM });

    return respondWithCode(200, spendingAnalytics);

  } catch (error) {
    console.error('Get spending analytics failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
