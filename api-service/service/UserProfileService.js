const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const {updateUserPhone, updateAuth0Username, deleteAuth0User } = require('../utils/auth0Util');
const { ObjectId } = require('mongodb'); // <-- Import ObjectId

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
 * Get User Activity Summary
 * Retrieves a summary of recent API usage and data submissions for the authenticated user.
 */
exports.getUserActivitySummary = async function (req) { // <-- Existing Function
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const auth0UserId = userData.sub;

    // --- Get User ObjectId ---
    const user = await db.collection('users').findOne({ auth0Id: auth0UserId }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }
    const userObjectId = user._id;

    // --- Cache Check ---
    const cacheKey = `${CACHE_KEYS.USER_ACTIVITY_SUMMARY}${userObjectId}`; // Define a new cache key constant
    const cachedSummary = await getCache(cacheKey);
    if (cachedSummary) {
      return respondWithCode(200, JSON.parse(cachedSummary));
    }

    // --- Define Timeframe (e.g., last 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // --- Aggregate API Usage ---
    const apiUsagePipeline = [
      { $match: { userId: userObjectId, timestamp: { $gte: thirtyDaysAgo } } }, // Match user and timeframe
      { $group: { _id: "$storeId", count: { $sum: 1 } } }, // Group by storeId and count
      { $project: { _id: 0, storeId: "$_id", count: 1 } } // Reshape output
    ];
    const apiUsageByStore = await db.collection('apiUsage').aggregate(apiUsagePipeline).toArray();
    const totalApiUsage = apiUsageByStore.reduce((sum, item) => sum + item.count, 0);

    // --- Aggregate Data Submissions ---
    const dataSubmissionPipeline = [
      { $match: { userId: userObjectId, timestamp: { $gte: thirtyDaysAgo } } }, // Match user and timeframe
      { $group: { _id: "$storeId", count: { $sum: 1 } } }, // Group by storeId and count
      { $project: { _id: 0, storeId: "$_id", count: 1 } } // Reshape output
    ];
    const submissionsByStore = await db.collection('userData').aggregate(dataSubmissionPipeline).toArray();
    const totalSubmissions = submissionsByStore.reduce((sum, item) => sum + item.count, 0);

    // --- Get Store Names ---
    const allInvolvedStoreIds = [
        ...new Set([
            ...apiUsageByStore.map(item => item.storeId),
            ...submissionsByStore.map(item => item.storeId)
        ])
    ];

    // Convert string IDs to ObjectIds for the query, handling potential errors
    const storeObjectIds = allInvolvedStoreIds.map(id => {
        try {
            if (ObjectId.isValid(id)) { return new ObjectId(id); }
            console.warn(`Invalid ObjectId format in activity summary store list: ${id}`);
            return null;
        } catch (e) {
            console.warn(`Error converting ObjectId for store name lookup: ${id}`, e);
            return null;
        }
    }).filter(id => id !== null);

    let storeNameMap = {};
    if (storeObjectIds.length > 0) {
        const stores = await db.collection('stores').find(
            { _id: { $in: storeObjectIds } },
            { projection: { _id: 1, name: 1 } }
        ).toArray();
        storeNameMap = stores.reduce((map, store) => {
            map[store._id.toString()] = store.name;
            return map;
        }, {});
    }

    // --- Format Results ---
    const formatActivity = (activityList) => activityList.map(item => ({
        storeId: item.storeId,
        name: storeNameMap[item.storeId] || 'Unknown Store',
        count: item.count
    })).sort((a, b) => b.count - a.count); // Sort by count descending

    const summary = {
      recentApiUsage: {
        total: totalApiUsage,
        byStore: formatActivity(apiUsageByStore)
      },
      recentSubmissions: {
        total: totalSubmissions,
        byStore: formatActivity(submissionsByStore)
      }
    };

    // --- Cache Result ---
    // Define a suitable TTL, e.g., USER_ACTIVITY_TTL
    await setCache(cacheKey, JSON.stringify(summary), { EX: CACHE_TTL.USER_ACTIVITY || 3600 }); // e.g., 1 hour

    return respondWithCode(200, summary);

  } catch (error) {
    console.error('Get user activity summary failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error retrieving activity summary' });
  }
};

/**
 * Get User Spending Analytics
 * Retrieves a breakdown of user spending by category based on purchase data.
 */
exports.getUserSpendingAnalytics = async function (req) { // <-- New Function
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const auth0UserId = userData.sub;

    // --- Get User ObjectId ---
    const user = await db.collection('users').findOne({ auth0Id: auth0UserId }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }
    const userObjectId = user._id;

    // --- Cache Check ---
    const cacheKey = `${CACHE_KEYS.USER_SPENDING_ANALYTICS}${userObjectId}`;
    const cachedAnalytics = await getCache(cacheKey);
    if (cachedAnalytics) {
      console.log(`Spending analytics retrieved from cache for user ${userObjectId}`);
      return respondWithCode(200, JSON.parse(cachedAnalytics));
    }
    console.log(`Calculating spending analytics for user ${userObjectId}`);


    // --- Aggregate Spending Data ---
    // This pipeline assumes 'category' exists directly on purchase items.
    // Adjust if category mapping happens differently (e.g., via product ID lookup).
    const spendingPipeline = [
      { $match: { userId: userObjectId, dataType: 'purchase' } }, // Filter for user's purchase data
      { $unwind: "$entries" }, // Deconstruct the entries array
      { $unwind: "$entries.items" }, // Deconstruct the items array within each entry
      {
        $group: {
          _id: "$entries.items.category", // Group by item category ID
          totalSpent: {
            $sum: {
              // Calculate total spent per item (price * quantity), handle missing values
              $multiply: [
                { $ifNull: ["$entries.items.price", 0] },
                { $ifNull: ["$entries.items.quantity", 1] }
              ]
            }
          }
        }
      },
      {
        $project: { // Reshape the output
          _id: 0, // Exclude the default _id
          categoryId: "$_id", // Rename _id to categoryId
          totalSpent: 1 // Include the calculated totalSpent
        }
      },
      { $match: { categoryId: { $ne: null } } } // Ensure we only include items with a category
    ];

    const spendingByCategory = await db.collection('userData').aggregate(spendingPipeline).toArray();

    // --- Get Taxonomy for Category Names ---
    // Fetch the full taxonomy (could also be cached separately)
    const taxonomyDoc = await db.collection('taxonomy').findOne({});
    const categoryNameMap = taxonomyDoc?.categories?.reduce((map, cat) => {
      map[cat.id] = cat.name;
      return map;
    }, {}) || {};

    // --- Format Results ---
    const spendingBreakdown = spendingByCategory.map(item => ({
      categoryId: item.categoryId,
      categoryName: categoryNameMap[item.categoryId] || item.categoryId, // Fallback to ID if name not found
      totalSpent: item.totalSpent
    })).sort((a, b) => b.totalSpent - a.totalSpent); // Sort descending by amount spent

    const analyticsResponse = {
      userId: userObjectId.toString(),
      timeframe: "All Time", // Placeholder - could be made dynamic later
      spendingBreakdown: spendingBreakdown
    };

    // --- Cache Result ---
    await setCache(cacheKey, JSON.stringify(analyticsResponse), { EX: CACHE_TTL.USER_ANALYTICS || 7200 });

    return respondWithCode(200, analyticsResponse);

  } catch (error) {
    console.error('Get user spending analytics failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error retrieving spending analytics' });
  }
};
