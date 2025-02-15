const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');

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
      reject(new Error('Invalid response type'));
      return;
    }

    const authUrl = new URL(process.env.AUTH0_AUTHORIZE_URL);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'openid profile email');

    resolve({ redirectUrl: authUrl.toString() });
  });
};

/**
 * Get OAuth2 Token
 * Exchange authorization code for access token.
 *
 * returns Token
 * */
exports.authTokenPOST = async function authTokenPOST(body) {
  const tokenEndpoint = process.env.AUTH0_TOKEN_URL;

  try {
    // Exchange code for token
    const tokenResponse = await axios.post(tokenEndpoint, {
      grant_type: body.grant_type,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri,
    });

    // Fetch user info from Auth0
    const userInfoResponse = await axios.get(process.env.AUTH0_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    });

    // Cache user info (sub, email) with token
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
    throw error;
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
          const err = new Error('Invalid role');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();
        const existingUser = await db.collection('users').findOne({ auth0Id: user.sub });

        if (existingUser) {
          const err = new Error('User already exists');
          err.status = 409;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        reject(err);
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
              status: 'inactive',
              deleted_at: new Date(),
              updated_at: new Date(),
            },
          },
        );
        if (!result.value) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
          return;
        }
        resolve({ message: 'User deleted successfully' });
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
          const err = new Error('User ID is required');
          err.status = 400;
          reject(err);
          return;
        }
        const db = getDB();
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
          return;
        }
        delete user.password;
        resolve(user);
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
          const err = new Error('User ID is required');
          err.status = 400;
          reject(err);
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
          const err = new Error('No valid update fields provided');
          err.status = 400;
          reject(err);
          return;
        }
        allowedUpdates.updated_at = new Date();
        const result = await db
          .collection('users')
          .findOneAndUpdate({ _id: userId }, { $set: allowedUpdates }, { returnDocument: 'after' });
        if (!result.value) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
          return;
        }
        delete result.value.password;
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
