const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Authorize User
 * Redirect to OAuth2 authorization page.
 *
 * response_type String
 * client_id String
 * redirect_uri String
 * no response value expected for this operation
 * */
exports.authAuthorizeGET = function authAuthorizeGET(responseType, clientId, redirectUri) {
  return new Promise((resolve, reject) => {
    if (responseType !== 'code') {
      reject(ApiError.BadRequest('Invalid response type'));
      return;
    }

    try {
      const authUrl = new URL(process.env.AUTH0_AUTHORIZE_URL);
      authUrl.searchParams.append('response_type', responseType);
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', 'openid profile email');

      resolve({ redirectUrl: authUrl.toString() });
    } catch (error) {
      console.error('Authorization URL error:', error);
      reject(ApiError.InternalError('Failed to generate authorization URL', error));
    }
  });
};

/**
 * Get OAuth2 Token
 * Exchange authorization code for access token.
 *
 * returns Token
 * */
exports.authTokenPOST = async function authTokenPOST(body) {
  try {
    if (!body.grant_type || !body.code) {
      throw ApiError.BadRequest('Missing required token parameters');
    }

    const tokenEndpoint = process.env.AUTH0_TOKEN_URL;
    const tokenResponse = await axios.post(tokenEndpoint, {
      grant_type: body.grant_type,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri,
    });

    const userInfoResponse = await axios.get(process.env.AUTH0_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
    });

    await setCache(
      `token:${tokenResponse.data.access_token}`,
      JSON.stringify({
        ...userInfoResponse.data,
        token: tokenResponse.data.access_token,
        expires_in: tokenResponse.data.expires_in,
      }),
      { EX: tokenResponse.data.expires_in },
    );

    return tokenResponse.data;
  } catch (error) {
    console.error('Token exchange error:', error);
    if (error.response?.status === 401) {
      throw ApiError.Unauthorized('Invalid authorization code');
    }
    throw ApiError.InternalError('Token exchange failed', error);
  }
};

/**
 * Register User
 * Create a new user (customer or store).
 *
 * body UserCreate
 * returns User
 * */
exports.usersPOST = function usersPOST(body, user) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Validate role
        if (!body.role || !['customer', 'store'].includes(body.role)) {
          reject(ApiError.BadRequest('Invalid role'));
          return;
        }

        const db = getDB();
        const existingUser = await db.collection('users').findOne({ auth0Id: user.sub });

        if (existingUser) {
          reject(ApiError.Conflict('User already exists'));
          return;
        }

        // Create new user
        const newUser = {
          auth0Id: user.sub,
          email: user.email,
          role: body.role,
          privacy_settings: {
            data_sharing: false,
            anonymized_id: generateAnonymizedId(),
          },
          preferences: {
            categories: [],
            purchase_history: [],
          },
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await db.collection('users').insertOne(newUser);
        resolve({
          id: result.insertedId,
          ...newUser,
        });
      } catch (error) {
        console.error('User creation error:', error);
        reject(ApiError.InternalError('Failed to create user', error));
      }
    })();
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
