const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Authorize User
 * Redirect to OAuth2 authorization page.
 */
exports.authAuthorizeGET = function authAuthorizeGET(responseType, clientId, redirectUri) {
  return new Promise((resolve, reject) => {
    // No implementation needed, handled by Auth0
    resolve();
  });
};

/**
 * Register User
 * Create a new user (customer or store).
 */
exports.usersPOST = function usersPOST(body) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDB();

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ email: body.email });
      if (existingUser) {
        return reject(ApiError.Conflict('User already exists'));
      }

      const newUser = {
        email: body.email,
        role: body.role,
        preferences: {},
        privacy_settings: {
          data_sharing: true,
          anonymized_id: generateAnonymizedId(),
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await db.collection('users').insertOne(newUser);
      const insertedUser = await db.collection('users').findOne({ _id: result.insertedId });

      resolve(insertedUser);
    } catch (error) {
      console.error('User creation error:', error);
      reject(ApiError.InternalError('Failed to create user', error));
    }
  });
};

/**
 * Delete User
 */
exports.usersUserIdDELETE = function usersUserIdDELETE(userId) {
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
              status: 'inactive',
              deleted_at: new Date(),
              updated_at: new Date(),
            },
          },
        );

        if (!result.value) {
          reject(ApiError.NotFound('User not found'));
          return;
        }

        resolve({ message: 'User deleted successfully' });
      } catch (error) {
        console.error('User deletion error:', error);
        reject(ApiError.InternalError('Failed to delete user', error));
      }
    })();
  });
};

/**
 * Get User Profile
 */
exports.usersUserIdGET = function usersUserIdGET(userId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!userId) {
          reject(ApiError.BadRequest('User ID is required'));
          return;
        }

        const db = getDB();
        const user = await db.collection('users').findOne({ _id: userId });

        if (!user) {
          reject(ApiError.NotFound('User not found'));
          return;
        }

        delete user.password;
        resolve(user);
      } catch (error) {
        console.error('Get user error:', error);
        reject(ApiError.InternalError('Failed to retrieve user', error));
      }
    })();
  });
};

/**
 * Update User Profile
 */
exports.usersUserIdPUT = function usersUserIdPUT(body, userId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!userId) {
          reject(ApiError.BadRequest('User ID is required'));
          return;
        }

        const db = getDB();
        const allowedUpdates = {
          email: body.email,
          preferences: body.preferences,
          privacy_settings: body.privacy_settings,
        };

        Object.keys(allowedUpdates).forEach(
          (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key],
        );

        if (Object.keys(allowedUpdates).length === 0) {
          reject(ApiError.BadRequest('No valid update fields provided'));
          return;
        }

        allowedUpdates.updated_at = new Date();
        const result = await db
          .collection('users')
          .findOneAndUpdate({ _id: userId }, { $set: allowedUpdates }, { returnDocument: 'after' });

        if (!result.value) {
          reject(ApiError.NotFound('User not found'));
          return;
        }

        delete result.value.password;
        resolve(result.value);
      } catch (error) {
        console.error('User update error:', error);
        reject(ApiError.InternalError('Failed to update user', error));
      }
    })();
  });
};
