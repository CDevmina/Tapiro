const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const {updateUserPhone, updateAuth0Username, deleteAuth0User } = require('../utils/auth0Util');
const { ObjectId } = require('mongodb'); // Ensure ObjectId is imported

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
        await updateUserMetadata(auth0UserId, { nickname: body.username });
      } catch (auth0Error) {
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
    let demographicsChanged = false; // Flag to track if demographics were updated

    // Update local DB username only if Auth0 update was successful (or not attempted)
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // Add demographic fields to updateData if provided and track changes
    if (body.gender !== undefined) {
        updateData.gender = body.gender;
        demographicsChanged = true;
    }
    if (body.incomeBracket !== undefined) {
        updateData.incomeBracket = body.incomeBracket;
        demographicsChanged = true;
    }
    if (body.country !== undefined) {
        updateData.country = body.country;
        demographicsChanged = true;
    }
    if (body.age !== undefined) {
        updateData.age = body.age;
        demographicsChanged = true;
    }

    // Only update allowed privacy settings
    let privacySettingsChanged = false; // Flag for privacy changes
    if (body.privacySettings !== undefined) {
      updateData.privacySettings = {};
      if (body.privacySettings.dataSharingConsent !== undefined) {
        updateData.privacySettings.dataSharingConsent = body.privacySettings.dataSharingConsent;
        privacySettingsChanged = true;
      }
      if (body.privacySettings.anonymizeData !== undefined) {
        updateData.privacySettings.anonymizeData = body.privacySettings.anonymizeData;
        privacySettingsChanged = true;
      }
      // DO NOT update optInStores or optOutStores here
    }

    if (body.dataAccess !== undefined) updateData.dataAccess = body.dataAccess;

    // Check if there's anything to update
    if (Object.keys(updateData).length <= 1 && !demographicsChanged && !privacySettingsChanged) {
        // Only updatedAt is set, nothing else changed
        // Fetch current profile to return if needed, or return specific message
        const currentUser = await db.collection('users').findOne(
            { auth0Id: auth0UserId },
            { projection: { preferences: 0 } }
        );
        return respondWithCode(200, currentUser || { message: "No changes detected." });
    }


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
    await invalidateCache(cacheKey); // Invalidate user data cache

    // Invalidate general preferences cache if demographics changed
    if (demographicsChanged) {
        await invalidateCache(`${CACHE_KEYS.PREFERENCES}${auth0UserId}`);
        console.log(`Invalidated general preferences cache for ${auth0UserId} due to demographic update.`);
    }

    // Invalidate store-specific preferences if demographics or relevant privacy settings changed
    // Also invalidate if the optInStores list exists (safer to clear on any profile update)
    if ((demographicsChanged || privacySettingsChanged) && result.privacySettings?.optInStores) {
       const userObjectId = result._id; // Use the _id from the updated result
       console.log(`Invalidating store preferences for user ${userObjectId} due to update.`);
       for (const storeId of result.privacySettings.optInStores) {
         const storePrefCacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userObjectId}:${storeId}`;
         await invalidateCache(storePrefCacheKey);
         console.log(`Invalidated cache: ${storePrefCacheKey}`);
       }
    }

    // Update cache with the new data (without preferences)
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

    // --- Date Range Handling ---
    const { startDate, endDate } = req.query;
    const dateMatch = {};
    if (startDate) {
      try {
        dateMatch['$gte'] = new Date(startDate);
      } catch (e) {
        console.warn('Invalid startDate format:', startDate);
      }
    }
    if (endDate) {
      try {
        // Add 1 day to endDate to include the whole day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateMatch['$lt'] = end;
      } catch (e) {
        console.warn('Invalid endDate format:', endDate);
      }
    }
    const hasDateFilter = Object.keys(dateMatch).length > 0;
    // --- End Date Range Handling ---


    // Find user to get their internal _id
    const user = await db.collection('users').findOne({ auth0Id: userData.sub }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Fetch the taxonomy once (remains the same)
    const taxonomyDoc = await db.collection('taxonomy').findOne({ current: true });
    const categoryMap = (taxonomyDoc && taxonomyDoc.data && taxonomyDoc.data.categories)
      ? taxonomyDoc.data.categories.reduce((map, cat) => {
          map[cat.id] = cat.name; // Assuming category ID is used in items
          map[cat.name] = cat.name; // Allow matching by name too, just in case
          return map;
        }, {})
      : {};

    const pipeline = [
      // Match user and data type
      { $match: { userId: user._id, dataType: 'purchase' } },
      // Unwind entries array
      { $unwind: '$entries' },
      // --- Add Date Filtering Stage ---
      ...(hasDateFilter ? [{ $match: { 'entries.timestamp': dateMatch } }] : []),
      // Unwind items array
      { $unwind: '$entries.items' },
      // --- Group by Month and Category ---
      {
        $group: {
          _id: {
            // Group by year-month and category
            yearMonth: { $dateToString: { format: "%Y-%m", date: "$entries.timestamp" } },
            category: '$entries.items.category' // Use the category field from item
          },
          // Calculate total spent for this category in this month
          monthlyTotal: {
            $sum: {
              $cond: {
                 if: { $and: [
                   { $isNumber: '$entries.items.price' },
                   { $isNumber: '$entries.items.quantity' }
                 ]},
                 then: { $multiply: ['$entries.items.price', '$entries.items.quantity'] },
                 // Handle cases where quantity might be missing but price exists
                 else: { $cond: { if: { $isNumber: '$entries.items.price' }, then: '$entries.items.price', else: 0 } }
              }
            }
          }
        }
      },
      // --- Group by Month to structure categories ---
      {
        $group: {
          _id: '$_id.yearMonth', // Group by month string (e.g., "2025-01")
          categories: {
            $push: { // Create an array of category-spend pairs for the month
              k: { $ifNull: [ { $toString: '$_id.category' }, "Unknown" ] }, // Category name (or ID as string)
              v: '$monthlyTotal'
            }
          }
        }
      },
      // --- Convert categories array to object and sort ---
      {
        $project: {
          _id: 0, // Exclude the default _id
          month: '$_id', // Rename _id to month
          spending: { $arrayToObject: '$categories' } // Convert [{k: "Cat1", v: 100}, ...] to { "Cat1": 100, ... }
        }
      },
      // Sort by month ascending
      { $sort: { month: 1 } }
    ];

    const results = await db.collection('userData').aggregate(pipeline).toArray();

    // --- Map category IDs/names to proper names from taxonomy ---
    const spendingAnalytics = results.map(monthlyData => {
      const mappedSpending = {};
      for (const categoryKey in monthlyData.spending) {
        const categoryName = categoryMap[categoryKey] || categoryKey; // Use mapped name or original key
        mappedSpending[categoryName] = monthlyData.spending[categoryKey];
      }
      return {
        month: monthlyData.month,
        spending: mappedSpending
      };
    });
    // --- End Mapping ---


    // Caching could be added here, considering date range in the key
    // const cacheKey = `${CACHE_KEYS.USER_SPENDING_ANALYTICS}${user._id}:${startDate || 'all'}:${endDate || 'all'}`;
    // await setCache(cacheKey, JSON.stringify(spendingAnalytics), { EX: CACHE_TTL.MEDIUM });

    // Return the array structure: [{ month: "YYYY-MM", spending: { "Category1": 100, ... } }, ...]
    return respondWithCode(200, spendingAnalytics);

  } catch (error) {
    console.error('Get spending analytics failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
