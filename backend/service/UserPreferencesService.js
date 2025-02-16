const { getDB } = require('../utils/mongoUtil');
const { ApiError } = require('../utils/errorUtil');

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
          reject(ApiError.BadRequest('User ID is required'));
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
          reject(ApiError.NotFound('User not found'));
          return;
        }

        resolve(result.value.preferences);
      } catch (error) {
        console.error('Update preferences error:', error);
        reject(ApiError.InternalError('Failed to update user preferences', error));
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
          reject(ApiError.BadRequest('User ID is required'));
          return;
        }

        if (!body.store_id || !body.items || !body.items.length) {
          reject(ApiError.BadRequest('Invalid purchase data - store ID and items are required'));
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
          reject(ApiError.NotFound('User not found'));
          return;
        }

        resolve({ message: 'Purchase logged successfully' });
      } catch (error) {
        console.error('Log purchase error:', error);
        reject(ApiError.InternalError('Failed to log purchase', error));
      }
    })();
  });
};
