const { getDB } = require('../utils/mongoUtil'); // #attachment:api-service/utils/mongoUtil.js
const { respondWithCode } = require('../utils/writer');
const { getUserData } = require('../utils/authUtil');
const { ObjectId } = require('mongodb');

// --- Helper Functions ---

// Load Taxonomy from MongoDB (Cached)
let taxonomy = null;
async function getTaxonomy() { // <-- Made async
  if (!taxonomy) {
    try {
      const db = getDB();
      // Assuming the taxonomy is stored in a single document in the 'taxonomy' collection.
      // Adjust the query if needed (e.g., findOne({ current: true }))
      console.log("Attempting to load taxonomy from database...");
      // You might want to specifically query for the document, e.g., findOne({ current: true })
      const taxonomyDoc = await db.collection('taxonomy').findOne(); // Or findOne({ current: true })

      if (!taxonomyDoc || !taxonomyDoc.data) { // Check if doc and data field exist
        console.error('Taxonomy document or its "data" field not found in the database collection "taxonomy".');
        throw new Error('Taxonomy data not found or invalid structure in database.');
      }

      // Assign the nested 'data' field which contains 'categories' and 'version'
      taxonomy = taxonomyDoc.data; // <-- FIX: Access the nested data field

      // Basic validation (should now work)
      if (!taxonomy || !Array.isArray(taxonomy.categories)) {
         console.error('Invalid taxonomy structure loaded from database (data field):', taxonomy);
         throw new Error('Invalid taxonomy structure in database (data field).');
      }

      console.log(`Taxonomy version ${taxonomy.version || 'N/A'} loaded successfully from database.`);
    } catch (e) {
      console.error('Failed to load taxonomy from database:', e);
      // Return a default structure or re-throw to prevent downstream issues
      // Returning empty avoids breaking everything if DB is temp unavailable, but logs clearly.
       return { categories: [] }; // Return default structure on error
    }
  }
  return taxonomy;
}

// Find top-level category (simple parent lookup)
function findTopLevelCategory(categoryId, categories) {
  if (!categories || categories.length === 0) return undefined; // Handle empty taxonomy
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  let current = categoryMap.get(categoryId);
  while (current && current.parent_id) {
    const parent = categoryMap.get(current.parent_id);
    if (!parent) break; // Stop if parent doesn't exist
    current = parent;
  }
  // Return the top-level category only if it doesn't have a parent_id itself
  return current && !current.parent_id ? current : undefined;
}

// --- Service Exports ---

/**
 * Get User Data Usage Summary
 */
exports.getUsageSummary = async function (req) {
  try {
    const db = getDB(); // #attachment:api-service/utils/mongoUtil.js
    const authData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1])); // #attachment:api-service/middleware/authMiddleware.js uses getUserData
    const user = await db.collection('users').findOne({ auth0Id: authData.sub }, { projection: { _id: 1 } }); // #attachment:dbSchemas.js

    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }
    const userId = user._id; // MongoDB ObjectId

    // --- Aggregation for Data Submissions (userData collection) ---
    const submissionPipeline = [
      { $match: { userId: userId } }, // Match documents for the specific user
      {
        $group: {
          _id: "$storeId", // Group by storeId (string)
          count: { $sum: 1 } // Count documents per store
        }
      },
      {
        $lookup: { // Join with stores collection
          from: 'stores',
          let: { storeIdStr: "$_id" }, // storeId from userData is a string
          pipeline: [
            // Convert string storeId to ObjectId for matching, handle potential errors
            { $addFields: { storeIdObj: { $cond: { if: { $ne: ["$$storeIdStr", null] }, then: { $toObjectId: "$$storeIdStr" }, else: null } } } },
            { $match: { $expr: { $eq: ["$_id", "$storeIdObj"] } } }, // <-- Fix: Use $ instead of $$
            { $project: { _id: 0, name: 1 } } // Project only the store name
          ],
          as: 'storeInfo'
        }
      },
      { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } }, // Keep results even if store lookup fails
      {
        $project: { // Shape the output
          _id: 0,
          storeId: "$_id", // Keep the original string storeId
          storeName: { $ifNull: ["$storeInfo.name", "Unknown Store"] }, // Use store name or default
          dataSubmissions: "$count"
        }
      }
    ];
    const submissionResults = await db.collection('userData').aggregate(submissionPipeline).toArray(); // #attachment:dbSchemas.js

    // --- Aggregation for Preference Requests (apiUsage collection) ---
    // Assumes 'apiUsage' logs contain 'accessedUserId' (as ObjectId) for preference requests
    const preferencePipeline = [
      {
        $match: { // Match relevant API usage logs
          accessedUserId: userId, // Match the user whose data was accessed (ObjectId)
          method: 'GET',
          endpoint: { $regex: /^\/users\/.*\/preferences$/ } // Match the preference endpoint pattern
        }
      },
      {
        $group: { // Group by storeId (should be ObjectId if logged correctly)
          _id: "$storeId",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: { // Join with stores collection
          from: 'stores',
          localField: '_id', // storeId in apiUsage should be ObjectId
          foreignField: '_id', // _id in stores is ObjectId
          as: 'storeInfo'
        }
      },
      { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: { // Shape the output
          _id: 0,
          storeId: { $toString: "$_id" }, // Convert store ObjectId back to string for consistency
          storeName: { $ifNull: ["$storeInfo.name", "Unknown Store"] },
          preferenceRequests: "$count"
        }
      }
    ];
    const preferenceResults = await db.collection('apiUsage').aggregate(preferencePipeline).toArray(); // #attachment:api-service/utils/dbSchemas.js starting at line 116

    // --- Combine Results ---
    const combinedUsage = new Map();
    let totalDataSubmissions = 0;
    let totalPreferenceRequests = 0;

    submissionResults.forEach(item => {
      totalDataSubmissions += item.dataSubmissions;
      combinedUsage.set(item.storeId, { // Use string storeId as key
        storeId: item.storeId,
        storeName: item.storeName,
        dataSubmissions: item.dataSubmissions,
        preferenceRequests: 0,
      });
    });

    preferenceResults.forEach(item => {
      totalPreferenceRequests += item.preferenceRequests;
      const storeIdStr = item.storeId; // Already a string from projection
      if (combinedUsage.has(storeIdStr)) {
        combinedUsage.get(storeIdStr).preferenceRequests = item.preferenceRequests;
      } else {
        combinedUsage.set(storeIdStr, {
          storeId: storeIdStr,
          storeName: item.storeName,
          dataSubmissions: 0,
          preferenceRequests: item.preferenceRequests,
        });
      }
    });

    const response = {
      totalDataSubmissions,
      totalPreferenceRequests,
      storeBreakdown: Array.from(combinedUsage.values()),
    };

    return respondWithCode(200, response);

  } catch (error) {
    console.error('Get usage summary failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get User Spending Analytics
 */
exports.getSpendingAnalytics = async function (req) { // <-- Already async
   try {
     const db = getDB();
     const authData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
     const user = await db.collection('users').findOne({ auth0Id: authData.sub }, { projection: { _id: 1 } });

     if (!user) {
       return respondWithCode(404, { code: 404, message: 'User not found' });
     }
     const userId = user._id;

     const pipeline = [
       { $match: { userId: userId, dataType: 'purchase' } }, // Filter for user's purchase data
       { $unwind: "$entries" }, // Deconstruct the entries array
       { $unwind: "$entries.items" }, // Deconstruct the items array within each entry
       {
         $group: { // Group by the specific item category ID
           _id: "$entries.items.category",
           // Sum the total amount: price * quantity (handle null quantity)
           totalAmount: { $sum: { $multiply: ["$entries.items.price", { $ifNull: ["$entries.items.quantity", 1] }] } },
           // Sum the total quantity (handle null quantity)
           itemCount: { $sum: { $ifNull: ["$entries.items.quantity", 1] } }
         }
       },
       {
         $project: { // Shape the output for this stage
           _id: 0,
           categoryId: "$_id", // The specific category ID
           totalAmount: 1,
           itemCount: 1
         }
       }
     ];

     const results = await db.collection('userData').aggregate(pipeline).toArray();

     // Load taxonomy and map to top-level categories
     const taxonomyData = await getTaxonomy(); // <-- Use await here
     if (!taxonomyData || !taxonomyData.categories || taxonomyData.categories.length === 0) {
        console.error("Taxonomy data is missing or invalid (from DB).");
        // Ensure the error message reflects the source
        return respondWithCode(500, { code: 500, message: 'Internal server error: Could not load category taxonomy from database.' });
     }
     const topLevelSpending = new Map();
     let overallTotalSpent = 0;

     results.forEach(item => {
       const topLevelCat = findTopLevelCategory(item.categoryId, taxonomyData.categories);

       if (topLevelCat) {
         const topLevelId = topLevelCat.id;
         const current = topLevelSpending.get(topLevelId) || { categoryId: topLevelId, categoryName: topLevelCat.name, totalAmount: 0, itemCount: 0 };
         current.totalAmount += item.totalAmount;
         current.itemCount += item.itemCount;
         topLevelSpending.set(topLevelId, current);
         overallTotalSpent += item.totalAmount;
       } else {
         // Optionally handle items whose category doesn't map to a top-level one
         console.warn(`Could not find top-level category for categoryId: ${item.categoryId}`);
         const unknownCat = topLevelSpending.get('unknown') || { categoryId: 'unknown', categoryName: 'Other/Unknown', totalAmount: 0, itemCount: 0 };
         unknownCat.totalAmount += item.totalAmount;
         unknownCat.itemCount += item.itemCount;
         topLevelSpending.set('unknown', unknownCat);
         overallTotalSpent += item.totalAmount;
       }
     });


     const response = {
       totalSpent: overallTotalSpent,
       // Filter out 'unknown' category if it has 0 amount, or decide how to display it
       categoryBreakdown: Array.from(topLevelSpending.values()).filter(cat => cat.totalAmount > 0),
     };

     return respondWithCode(200, response);

   } catch (error) {
     console.error('Get spending analytics failed:', error);
     return respondWithCode(500, { code: 500, message: 'Internal server error' });
   }
};

/**
 * Get Recent User Data Entries
 */
exports.getRecentData = async function (req, limit = 10) {
  try {
    const db = getDB();
    const authData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));
    const user = await db.collection('users').findOne({ auth0Id: authData.sub }, { projection: { _id: 1 } });

    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }
    const userId = user._id;
    // Sanitize and validate the limit parameter
    const queryLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const pipeline = [
      { $match: { userId: userId } }, // Filter by user ID
      { $sort: { timestamp: -1 } }, // Sort by timestamp descending (most recent first)
      { $limit: queryLimit }, // Limit the number of results
      {
        $lookup: { // Join with stores collection to get store name
          from: 'stores',
          let: { storeIdStr: "$storeId" }, // storeId from userData is a string
          pipeline: [
            // Convert string storeId to ObjectId for matching, handle potential errors
             { $addFields: { storeIdObj: { $cond: { if: { $ne: ["$$storeIdStr", null] }, then: { $toObjectId: "$$storeIdStr" }, else: null } } } },
            { $match: { $expr: { $eq: ["$_id", "$storeIdObj"] } } }, // <-- Fix: Use $ instead of $$
            { $project: { _id: 0, name: 1 } }
          ],
          as: 'storeInfo'
        }
      },
      { $unwind: { path: '$storeInfo', preserveNullAndEmptyArrays: true } }, // Keep results even if store lookup fails
      {
        $project: { // Shape the output document
          _id: 0,
          entryId: { $toString: "$_id" }, // Convert the document's ObjectId to string
          storeId: "$storeId", // Keep original string storeId
          storeName: { $ifNull: ["$storeInfo.name", "Unknown Store"] }, // Use store name or default
          dataType: "$dataType",
          timestamp: "$timestamp",
          // Generate a user-friendly summary string based on dataType
          summary: {
            $switch: {
              branches: [
                { // Case for 'purchase'
                  case: { $eq: ["$dataType", "purchase"] },
                  then: {
                    // Concatenate strings to form "Purchase of X items"
                    $concat: [
                      "Purchase of ",
                      // Get the size of the items array (handle null/missing)
                      { $toString: { $size: { $ifNull: [{ $arrayElemAt: ["$entries.items", 0] }, []] } } },
                      " items"
                    ]
                  }
                },
                { // Case for 'search'
                  case: { $eq: ["$dataType", "search"] },
                  then: {
                    // Concatenate strings to form "Search for 'query'"
                     $concat: [
                       "Search for '",
                       // Get the query string from the first entry (handle null/missing)
                       { $ifNull: [ { $arrayElemAt: ["$entries.query", 0] }, "N/A" ] },
                       "'"
                     ]
                  }
                }
              ],
              default: "Data entry" // Default summary if dataType is unknown
            }
          }
        }
      }
    ];

    const recentEntries = await db.collection('userData').aggregate(pipeline).toArray();

    return respondWithCode(200, recentEntries);

  } catch (error) {
    console.error('Get recent data failed:', error);
    // Check for specific errors like invalid ObjectId conversion if needed
    if (error.message.includes("Argument passed in must be a string of 12 bytes or a string of 24 hex characters")) {
        console.error("Potential invalid ObjectId format in storeId within userData collection.");
    }
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get Consenting Stores
 */
exports.getConsentingStores = async function (req) {
  try {
    const db = getDB();
    const authData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Get user's optInStores list
    const user = await db.collection('users').findOne(
      { auth0Id: authData.sub },
      // Project only the necessary field
      { projection: { 'privacySettings.optInStores': 1 } }
    );

    if (!user) {
      return respondWithCode(404, { code: 404, message: 'User not found' });
    }

    // Extract the list of store IDs (strings)
    const optInStoreIds = user.privacySettings?.optInStores || [];

    if (optInStoreIds.length === 0) {
      return respondWithCode(200, []); // Return empty list if no opt-ins
    }

    // Convert string IDs to ObjectIds for querying, filtering out invalid ones
    const storeObjectIds = optInStoreIds.map(id => {
        try {
            // Ensure id is a non-empty string before attempting conversion
            if (typeof id === 'string' && id.length > 0) {
                return new ObjectId(id);
            }
            return null;
        } catch (e) {
            console.warn(`Invalid ObjectId format found in optInStores: ${id}`);
            return null; // Return null for invalid formats
        }
    }).filter(id => id !== null); // Filter out nulls resulting from invalid IDs

    if (storeObjectIds.length === 0) {
        // This can happen if all stored IDs were invalid
        return respondWithCode(200, []);
    }

    // Find stores matching the valid ObjectIds
    const stores = await db.collection('stores').find(
      { _id: { $in: storeObjectIds } }, // Use $in operator with the array of ObjectIds
      { projection: { _id: 1, name: 1 } } // Project only ID and name
    ).toArray();

    // Format response according to the ConsentingStore schema
    const consentingStores = stores.map(store => ({
      storeId: store._id.toString(), // Convert ObjectId back to string
      name: store.name,
      // optInDate: could be added if tracked in user document (e.g., as an object {storeId, date})
    }));

    return respondWithCode(200, consentingStores);

  } catch (error) {
    console.error('Get consenting stores failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};