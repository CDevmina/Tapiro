const { getDB } = require('../utils/mongoUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Get engagement analytics
 * Retrieve engagement metrics including click-through rates and ad interaction statistics
 *
 * storeId String Store ID
 * returns Analytics
 */
exports.getEngagement = function getEngagement(storeId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId) {
          reject(ApiError.BadRequest('Store ID is required'));
          return;
        }

        const db = getDB();

        // Verify store exists and has correct role
        const store = await db.collection('users').findOne({
          _id: storeId,
          role: 'store',
        });

        if (!store) {
          reject(ApiError.NotFound('Store not found'));
          return;
        }

        // Aggregate scan events for engagement metrics
        const scanEvents = await db
          .collection('scan_events')
          .aggregate([
            { $match: { store_id: storeId } },
            {
              $group: {
                _id: null,
                total_scans: { $sum: 1 },
                avg_engagement_time: { $avg: '$engagement_time' },
                top_categories: { $addToSet: '$ad_category' },
              },
            },
          ])
          .toArray();

        const analytics = {
          top_categories: scanEvents[0]?.top_categories || [],
          avg_engagement_time: scanEvents[0]?.avg_engagement_time || 0,
          total_scans: scanEvents[0]?.total_scans || 0,
        };

        resolve(analytics);
      } catch (error) {
        console.error('Get engagement analytics error:', error);
        reject(ApiError.InternalError('Failed to retrieve engagement analytics', error));
      }
    })();
  });
};

/**
 * Get demographic analytics
 * Access demographic data and preference trends of store customers
 *
 * storeId String Store ID
 * returns Analytics
 */
exports.getDemographics = function getDemographics(storeId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId) {
          reject(ApiError.BadRequest('Store ID is required'));
          return;
        }

        const db = getDB();

        // Verify store exists and has correct role
        const store = await db.collection('users').findOne({
          _id: storeId,
          role: 'store',
        });

        if (!store) {
          reject(ApiError.NotFound('Store not found'));
          return;
        }

        // Aggregate customer preferences and purchase history
        const customerData = await db
          .collection('users')
          .aggregate([
            {
              $match: {
                role: 'customer',
                'preferences.purchase_history.store_id': storeId,
              },
            },
            {
              $unwind: '$preferences.categories',
            },
            {
              $group: {
                _id: '$preferences.categories',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
            {
              $limit: 5,
            },
          ])
          .toArray();

        const analytics = {
          top_categories: customerData.map((cat) => cat._id),
          customer_count: await db.collection('users').countDocuments({
            role: 'customer',
            'preferences.purchase_history.store_id': storeId,
          }),
          category_distribution: customerData,
        };

        resolve(analytics);
      } catch (error) {
        console.error('Get demographics analytics error:', error);
        reject(ApiError.InternalError('Failed to retrieve demographic analytics', error));
      }
    })();
  });
};
