const { getDB } = require('../utils/mongoUtil');

/**
 * Update user preferences
 * Updates the preferences for a specific user.
 *
 * body User_preferences Preferences to update
 * userId String User ID
 * returns User_preferences
 */
exports.updatePreferences = function updatePreferences(body, userId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!userId) {
          const err = new Error('User ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();
        const result = await db.collection('users').findOneAndUpdate(
          { _id: userId },
          {
            $set: {
              'preferences.categories': body.categories || [],
              updated_at: new Date(),
            },
          },
          { returnDocument: 'after' },
        );

        if (!result.value) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
          return;
        }

        resolve(result.value.preferences);
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
 * Log purchase history
 * Logs a purchase for a specific user.
 *
 * body Purchase Purchase details
 * userId String User ID
 * no response value expected for this operation
 */
exports.logPurchase = function logPurchase(body, userId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!userId) {
          const err = new Error('User ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        if (!body.store_id || !body.items || !body.items.length) {
          const err = new Error('Invalid purchase data');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();
        const purchase = {
          store_id: body.store_id,
          items: body.items,
          timestamp: new Date(),
        };

        // Add purchase to history and update categories
        const categories = [...new Set(body.items.map((item) => item.category))];
        const result = await db.collection('users').findOneAndUpdate(
          { _id: userId },
          {
            $push: {
              'preferences.purchase_history': purchase,
            },
            $addToSet: {
              'preferences.categories': { $each: categories },
            },
            $set: {
              updated_at: new Date(),
            },
          },
          { returnDocument: 'after' },
        );

        if (!result.value) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
          return;
        }

        resolve({ message: 'Purchase logged successfully' });
      } catch (error) {
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};
