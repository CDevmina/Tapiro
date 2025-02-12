const { getDB } = require('../utils/mongoUtil');

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
          const err = new Error('Store ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Verify store exists and has correct role
        const store = await db.collection('users').findOne({
          _id: storeId,
          role: 'store',
        });

        if (!store) {
          const err = new Error('Store not found');
          err.status = 404;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
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
          const err = new Error('Store ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Verify store exists and has correct role
        const store = await db.collection('users').findOne({
          _id: storeId,
          role: 'store',
        });

        if (!store) {
          const err = new Error('Store not found');
          err.status = 404;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};
