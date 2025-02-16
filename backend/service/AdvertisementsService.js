const { getDB } = require('../utils/mongoUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Create new advertisement
 * Create a new targeted advertisement for a specific store
 *
 * body Ad Advertisement to create
 * storeId String Store ID
 * returns Ad
 */
exports.createAd = function createAd(body, storeId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId) {
          reject(ApiError.BadRequest('Store ID is required'));
          return;
        }

        if (!body.title || !body.target_categories) {
          reject(ApiError.BadRequest('Title and target categories are required'));
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

        const newAd = {
          store_id: storeId,
          title: body.title,
          description: body.description || '',
          target_categories: body.target_categories,
          media_url: body.media_url || '',
          validity_period: {
            start: body.validity_period?.start ? new Date(body.validity_period.start) : new Date(),
            end: body.validity_period?.end ? new Date(body.validity_period.end) : null,
          },
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await db.collection('ads').insertOne(newAd);
        resolve({
          id: result.insertedId,
          ...newAd,
        });
      } catch (error) {
        console.error('Ad creation error:', error);
        reject(ApiError.InternalError('Failed to create advertisement', error));
      }
    })();
  });
};

/**
 * List store ads
 * Retrieve all active advertisements for a specific store
 *
 * storeId String Store ID
 * returns Array of Ad
 */
exports.listAds = function listAds(storeId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId) {
          reject(ApiError.BadRequest('Store ID is required'));
          return;
        }

        const db = getDB();

        const ads = await db
          .collection('ads')
          .find({
            store_id: storeId,
            'validity_period.end': { $gt: new Date() },
          })
          .toArray();

        resolve(ads);
      } catch (error) {
        console.error('List ads error:', error);
        reject(ApiError.InternalError('Failed to retrieve advertisements', error));
      }
    })();
  });
};

/**
 * Update specific ad
 * Modify an existing advertisement's details
 *
 * body Ad Updated advertisement data
 * storeId String Store ID
 * adId String Advertisement ID
 * returns Ad
 */
exports.updateAd = function updateAd(body, storeId, adId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId || !adId) {
          reject(ApiError.BadRequest('Store ID and Ad ID are required'));
          return;
        }

        const db = getDB();

        const updates = {
          ...body,
          updated_at: new Date(),
        };

        if (body.validity_period) {
          updates.validity_period = {
            start: body.validity_period.start ? new Date(body.validity_period.start) : new Date(),
            end: body.validity_period.end ? new Date(body.validity_period.end) : null,
          };
        }

        const result = await db
          .collection('ads')
          .findOneAndUpdate(
            { _id: adId, store_id: storeId },
            { $set: updates },
            { returnDocument: 'after' },
          );

        if (!result.value) {
          reject(ApiError.NotFound('Advertisement not found'));
          return;
        }

        resolve(result.value);
      } catch (error) {
        console.error('Update ad error:', error);
        reject(ApiError.InternalError('Failed to update advertisement', error));
      }
    })();
  });
};

/**
 * Delete specific ad
 * Permanently remove an advertisement
 *
 * storeId String Store ID
 * adId String Advertisement ID
 * returns null
 */
exports.deleteAd = function deleteAd(storeId, adId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId || !adId) {
          reject(ApiError.BadRequest('Store ID and Ad ID are required'));
          return;
        }

        const db = getDB();

        const result = await db.collection('ads').deleteOne({
          _id: adId,
          store_id: storeId,
        });

        if (result.deletedCount === 0) {
          reject(ApiError.NotFound('Advertisement not found'));
          return;
        }

        resolve({ message: 'Advertisement deleted successfully' });
      } catch (error) {
        console.error('Delete ad error:', error);
        reject(ApiError.InternalError('Failed to delete advertisement', error));
      }
    })();
  });
};
