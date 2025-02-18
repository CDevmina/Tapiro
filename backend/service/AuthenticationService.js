const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Authorize User
 * Build the Auth0 authorization URL.
 *
 * responseType String, clientId unused (use env) and redirectUri String.
 * Returns an object with the authorization URL.
 */
exports.authAuthorizeGET = function authAuthorizeGET(responseType, clientId, redirectUri) {
  return new Promise((resolve) => {
    const authUrl = `${process.env.AUTH0_AUTHORIZE_URL}?response_type=${encodeURIComponent(responseType)}&client_id=${encodeURIComponent(process.env.AUTH0_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
    resolve({ authorizationUrl: authUrl });
  });
};

/**
 * Exchange authorization code for tokens.
 *
 * code String, redirectUri String.
 * Returns token data from Auth0.
 */
exports.authTokenPOST = function authTokenPOST(code, redirectUri) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
      });
      const tokenRes = await axios.post(process.env.AUTH0_TOKEN_URL, data.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      resolve(tokenRes.data);
    } catch (err) {
      reject(ApiError.InternalError('Token exchange failed', err));
    }
  });
};

/**
 * Register User
 * Create a new user (customer or store), assign role and persist in MongoDB.
 *
 * body UserCreate with at least email and role.
 * Returns the newly created user.
 */
exports.usersPOST = function usersPOST(body, user) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!body || !body.email || !body.role) {
        reject(ApiError.BadRequest('Email and role are required'));
        return;
      }
      const db = getDB();
      // Check for an existing user by email.
      let existingUser = await db.collection('users').findOne({ email: body.email });
      if (existingUser) {
        resolve(existingUser);
        return;
      }
      // Create new user record.
      const newUser = {
        email: body.email,
        role: body.role, // role should be either 'customer' or 'store'
        preferences: body.preferences || { categories: [], purchase_history: [] },
        privacy_settings: body.privacy_settings || {
          data_sharing: true,
          anonymized_id: generateAnonymizedId(),
        },
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      newUser._id = result.insertedId;
      resolve(newUser);
    } catch (err) {
      reject(ApiError.InternalError('Failed to register user', err));
    }
  });
};

/**
 * Delete User
 *
 * userId String
 * no response value expected for this operation
 * */
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
 *
 * userId String
 * returns User
 * */
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
 *
 * body UserUpdate
 * userId String
 * returns User
 * */
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
