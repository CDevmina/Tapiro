const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, invalidateCache } = require('../utils/redisUtil');
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');
const { updateUserPhone, deleteAuth0User, updateUserMetadata } = require('../utils/auth0Util');
const { ObjectId } = require('mongodb');

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
      { projection: { preferences: 0 } }, // Exclude preferences
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
    const tokenUserData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const auth0UserId = tokenUserData.sub;

    // Fetch the current user state from DB to compare demographic data
    const currentUser = await db.collection('users').findOne({ auth0Id: auth0UserId });
    if (!currentUser) {
      return respondWithCode(404, { code: 404, message: 'User not found for update' });
    }

    // --- Local DB Username Uniqueness Check ---
    // Keep this check for your application's internal username uniqueness
    if (body.username) {
      const existingUserByUsername = await db.collection('users').findOne({ username: body.username });
      if (existingUserByUsername && existingUserByUsername.auth0Id !== auth0UserId) {
        return respondWithCode(409, { code: 409, message: 'Username already taken' });
      }
    }

    // --- Auth0 Username Update ---
    // Attempt to update the Auth0 username if provided in the body.
    // Auth0 will enforce its own uniqueness rules per connection.
    if (body.username) {
      try {
        await updateUserMetadata(auth0UserId, { username: body.username });
      } catch (authError) {
        console.warn(`Auth0 username update failed for ${auth0UserId}:`, authError.message);
        // Potentially return error or just log and continue with local DB update
      }
    }

    // --- Phone Number Update in Auth0 ---
    if (body.phone && body.phone !== tokenUserData.phone_number) { // Use tokenUserData for initial phone
      try {
        await updateUserPhone(auth0UserId, body.phone);
      } catch (authError) {
        console.warn(`Auth0 phone update failed for ${auth0UserId}:`, authError.message);
        // Potentially return error or just log and continue
      }
    }

    // --- Database Update ---
    const updateData = {
      updatedAt: new Date(),
    };
    let demographicsChanged = false;
    // Update local DB username and phone
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // --- Update Demographic Data ---
    if (body.demographicData) {
      const newDemoData = body.demographicData;
      const currentDemoData = currentUser.demographicData || {};

      // Helper function to process demographic fields
      const processDemographicField = (fieldName, inferredFieldName) => {
        if (newDemoData.hasOwnProperty(fieldName)) {
          const newValue = newDemoData[fieldName];
          const currentValue = currentDemoData[fieldName];

          // Always update the user-provided field if it's in the payload
          updateData[`demographicData.${fieldName}`] = newValue;

          if (newValue !== currentValue) {
            demographicsChanged = true;
          }

          // If the new value is null (clearing/unverifying) OR if the user-provided value changed,
          // and there's an inferred field, clear the inferred field.
          if (inferredFieldName && (newValue === null || newValue !== currentValue)) {
            // Check if the inferred field actually changes to trigger demographicsChanged
            if (currentDemoData[inferredFieldName] !== null) {
              demographicsChanged = true;
            }
            updateData[`demographicData.${inferredFieldName}`] = null;
          }
        }
      };
      
      processDemographicField('gender', 'inferredGender');
      processDemographicField('incomeBracket'); // No inferred counterpart
      processDemographicField('country'); // No inferred counterpart

      // Age - special handling for parsing and validation
      if (newDemoData.hasOwnProperty('age')) {
        const newAgeValue = newDemoData.age === null || newDemoData.age === undefined ? null : parseInt(String(newDemoData.age));
        if (newAgeValue === null || (typeof newAgeValue === 'number' && newAgeValue >= 0 && Number.isInteger(newAgeValue))) {
          if (newAgeValue !== currentDemoData.age) {
            updateData['demographicData.age'] = newAgeValue;
            demographicsChanged = true;
          } else {
            updateData['demographicData.age'] = newAgeValue;
          }
        } else {
          console.warn(`Invalid age value provided for user ${auth0UserId}: ${newDemoData.age}`);
        }
      }
      
      processDemographicField('hasKids', 'inferredHasKids');
      processDemographicField('relationshipStatus', 'inferredRelationshipStatus');
      processDemographicField('employmentStatus', 'inferredEmploymentStatus');
      processDemographicField('educationLevel', 'inferredEducationLevel');
    }
    // --- End Update Demographic Data ---

    // Only update allowed privacy settings
    let privacySettingsChanged = false; // Flag for privacy changes
    if (body.privacySettings !== undefined) {
      // Use dot notation for nested privacy settings updates
      if (body.privacySettings.dataSharingConsent !== undefined) {
        updateData['privacySettings.dataSharingConsent'] = body.privacySettings.dataSharingConsent;
        privacySettingsChanged = true;
      }
      if (body.privacySettings.allowInference !== undefined) {
        // <-- Add check for allowInference
        updateData['privacySettings.allowInference'] = body.privacySettings.allowInference;
        privacySettingsChanged = true;
      }
      // DO NOT update optInStores or optOutStores here
    }

    // Check if there's anything to update (excluding updatedAt)
    const updateKeys = Object.keys(updateData).filter((key) => key !== 'updatedAt');
    if (updateKeys.length === 0) {
      // Nothing changed
      const latestUser = await db
        .collection('users')
        .findOne({ auth0Id: auth0UserId }, { projection: { preferences: 0 } });
      return respondWithCode(200, latestUser || { message: 'No changes detected.' });
    }

    console.log(`Updating user ${auth0UserId} with data:`, updateData);

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: auth0UserId },
        { $set: updateData },
        { returnDocument: 'after', projection: { preferences: 0 } }, // Ensure email is projected
      );

    if (!result) {
      return respondWithCode(404, { code: 404, message: 'User not found during final update' });
    }

    // --- Cache Invalidation & Update ---
    const cacheKey = `${CACHE_KEYS.USER_DATA}${auth0UserId}`;
    await invalidateCache(cacheKey); // Invalidate user data cache

    // Invalidate general preferences cache if demographics changed
    if (demographicsChanged) {
      await invalidateCache(`${CACHE_KEYS.PREFERENCES}${auth0UserId}`);
      console.log(
        `Invalidated general preferences cache for ${auth0UserId} due to demographic update.`,
      );
    }

    // Invalidate store-specific preferences if demographics or relevant privacy settings changed
    const updatedUserDoc = result; // Use the returned document from findOneAndUpdate

    if (demographicsChanged || privacySettingsChanged) {
      const userObjectId = updatedUserDoc._id; // This should be correct from the result
      const userEmail = updatedUserDoc.email; // Make sure email is available in updatedUserDoc

      if (userEmail && updatedUserDoc.privacySettings?.optInStores?.length > 0) {
        console.log(`Invalidating store preferences for user ${userObjectId} (email: ${userEmail}) due to privacy/demographic update.`);
        for (const storeId of updatedUserDoc.privacySettings.optInStores) {
          // Invalidate cache key used by external API (email based)
          const externalApiCacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${userEmail}:${storeId}`;
          await invalidateCache(externalApiCacheKey);
          console.log(`Invalidated external store preference cache: ${externalApiCacheKey}`);
        }
      }
    }

    // Update cache with the new data (without preferences)
    await setCache(cacheKey, JSON.stringify(updatedUserDoc), { EX: CACHE_TTL.USER_DATA });

    return respondWithCode(200, updatedUserDoc);
  } catch (error) {
    console.error('Update profile failed:', error);
    // Check for specific MongoDB errors if needed (e.g., validation errors)
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error during profile update',
    });
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

    // Find user to get ID and email for cache invalidation later
    const user = await db
      .collection('users')
      .findOne({ auth0Id: userData.sub }, { projection: { _id: 1, email: 1, privacySettings: 1 } }); // Ensure email is projected
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
    if (user.email && userPrivacySettings?.optInStores && userPrivacySettings.optInStores.length > 0) { // Check if user.email is available and stores exist
      console.log(`Invalidating store-specific preferences for deleted user ${user.email} across ${userPrivacySettings.optInStores.length} stores.`);
      for (const storeId of userPrivacySettings.optInStores) {
        // Use email for the cache key
        const storePrefCacheKey = `${CACHE_KEYS.STORE_PREFERENCES}${user.email}:${storeId}`;
        await invalidateCache(storePrefCacheKey);
        console.log(`Invalidated store preference cache (email key): ${storePrefCacheKey}`);
      }
    } else if (!user.email && userPrivacySettings?.optInStores && userPrivacySettings.optInStores.length > 0) {
      console.warn(`User ${user._id} (Auth0 ID: ${userData.sub}) was deleted and had opt-in stores, but email was missing. Cannot invalidate STORE_PREFERENCES by email.`);
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
exports.getRecentUserData = async function (
  req,
  limit = 10,
  page = 1,
  dataType,
  storeId,
  startDate,
  endDate,
  searchTerm,
) {
  // Add new params
  try {
    const db = getDB();
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Find user to get their internal _id
    const user = await db
      .collection('users')
      .findOne({ auth0Id: userData.sub }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    const skip = (page - 1) * limit;

    // --- Build the MongoDB query dynamically ---
    const matchQuery = { userId: user._id };

    if (dataType) {
      matchQuery.dataType = dataType;
    }
    if (storeId) {
      // Validate storeId format if necessary before querying
      try {
        matchQuery.storeId = new ObjectId(storeId);
      } catch (e) {
        console.warn(`Invalid storeId format provided: ${storeId}`);
        // Decide how to handle: return empty, error, or ignore filter
        return respondWithCode(400, { code: 400, message: 'Invalid store ID format provided.' });
      }
    }

    // Date range filtering on the main document timestamp
    const dateFilter = {};
    if (startDate) {
      try {
        dateFilter.$gte = new Date(startDate);
      } catch (e) {
        console.warn('Invalid startDate format:', startDate);
      }
    }
    if (endDate) {
      try {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Include the whole end day
        dateFilter.$lt = end;
      } catch (e) {
        console.warn('Invalid endDate format:', endDate);
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      matchQuery.timestamp = dateFilter;
    }

    // Search term filtering within entries (simple regex example)
    // NOTE: For better performance on large datasets, consider a text index
    // on 'entries.items.name', 'entries.items.category', 'entries.query', etc.
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i'); // Case-insensitive regex
      matchQuery.$or = [
        { 'entries.items.name': regex },
        { 'entries.items.category': regex },
        { 'entries.query': regex },
        // Add other fields within entries to search if needed
      ];
    }
    // --- End Query Building ---

    // Query userData collection with the built query
    const recentData = await db
      .collection('userData')
      .find(matchQuery) // Use the dynamic query
      .sort({ timestamp: -1 }) // Sort by submission time descending
      .skip(skip)
      .limit(limit)
      .project({
        // Expand projection to include details needed for display
        _id: 1,
        storeId: 1,
        dataType: 1,
        timestamp: 1, // Submission timestamp
        entries: 1, // Include the full entries array for now
        // Alternatively, project specific fields from entries if known:
        // 'entries.timestamp': 1,
        // 'entries.query': 1,
        // 'entries.items.name': 1,
        // 'entries.items.price': 1,
        // 'entries.items.quantity': 1,
        // 'entries.items.category': 1,
      })
      .toArray();

    // Simple transformation (can be enhanced on frontend)
    const formattedData = recentData.map((entry) => ({
      _id: entry._id.toString(), // Convert ObjectId to string
      storeId: entry.storeId.toString(), // Convert ObjectId to string
      dataType: entry.dataType,
      timestamp: entry.timestamp,
      // Process entries for simpler display structure if needed here,
      // or handle it on the frontend. Example:
      details: entry.entries.map((e) => ({
        timestamp: e.timestamp,
        ...(entry.dataType === 'purchase' && { items: e.items }),
        ...(entry.dataType === 'search' && { query: e.query, results: e.results }),
      })),
    }));

    // Caching: Consider if caching is appropriate with dynamic filters.
    // If cached, the cache key MUST include all filter parameters.
    // Example: const cacheKey = `${CACHE_KEYS.USER_RECENT_DATA}${user._id}:${page}:${limit}:${dataType || 'all'}:${storeId || 'all'}:${startDate || 'all'}:${endDate || 'all'}:${searchTerm || ''}`;

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
    const user = await db
      .collection('users')
      .findOne({ auth0Id: userData.sub }, { projection: { _id: 1 } });
    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Fetch the taxonomy once (remains the same)
    const taxonomyDoc = await db.collection('taxonomy').findOne({ current: true });
    const categoryMap =
      taxonomyDoc && taxonomyDoc.data && taxonomyDoc.data.categories
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
            yearMonth: { $dateToString: { format: '%Y-%m', date: '$entries.timestamp' } },
            category: '$entries.items.category', // Use the category field from item
          },
          // Calculate total spent for this category in this month
          monthlyTotal: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $isNumber: '$entries.items.price' },
                    { $isNumber: '$entries.items.quantity' },
                  ],
                },
                then: { $multiply: ['$entries.items.price', '$entries.items.quantity'] },
                // Handle cases where quantity might be missing but price exists
                else: {
                  $cond: {
                    if: { $isNumber: '$entries.items.price' },
                    then: '$entries.items.price',
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      // --- Group by Month to structure categories ---
      {
        $group: {
          _id: '$_id.yearMonth', // Group by month string (e.g., "2025-01")
          categories: {
            $push: {
              // Create an array of category-spend pairs for the month
              k: { $ifNull: [{ $toString: '$_id.category' }, 'Unknown'] }, // Category name (or ID as string)
              v: '$monthlyTotal',
            },
          },
        },
      },
      // --- Convert categories array to object and sort ---
      {
        $project: {
          _id: 0, // Exclude the default _id
          month: '$_id', // Rename _id to month
          spending: { $arrayToObject: '$categories' }, // Convert [{k: "Cat1", v: 100}, ...] to { "Cat1": 100, ... }
        },
      },
      // Sort by month ascending
      { $sort: { month: 1 } },
    ];

    const results = await db.collection('userData').aggregate(pipeline).toArray();

    // --- Map category IDs/names to proper names from taxonomy ---
    const spendingAnalytics = results.map((monthlyData) => {
      const mappedSpending = {};
      for (const categoryKey in monthlyData.spending) {
        const categoryName = categoryMap[categoryKey] || categoryKey; // Use mapped name or original key
        mappedSpending[categoryName] = monthlyData.spending[categoryKey];
      }
      return {
        month: monthlyData.month,
        spending: mappedSpending,
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
