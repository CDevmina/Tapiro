const { getDB } = require('../utils/mongoUtil');

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
          const err = new Error('Store ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        if (!body.title || !body.target_categories) {
          const err = new Error('Title and target categories are required');
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
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
          const err = new Error('Store ID is required');
          err.status = 400;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
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
          const err = new Error('Store ID and Ad ID are required');
          err.status = 400;
          reject(err);
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
          const err = new Error('Advertisement not found');
          err.status = 404;
          reject(err);
          return;
        }

        resolve(result.value);
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
          const err = new Error('Store ID and Ad ID are required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        const result = await db.collection('ads').deleteOne({
          _id: adId,
          store_id: storeId,
        });

        if (result.deletedCount === 0) {
          const err = new Error('Advertisement not found');
          err.status = 404;
          reject(err);
          return;
        }

        resolve();
      } catch (error) {
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};
