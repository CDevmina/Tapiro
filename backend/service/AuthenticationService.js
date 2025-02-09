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
exports.authAuthorizeGET = function (response_type, client_id, redirect_uri) {
  return new Promise((resolve, reject) => {
    if (response_type !== 'code') {
      reject(new Error('Invalid response type'));
      return;
    }

    const authUrl = new URL(process.env.AUTH0_AUTHORIZE_URL);
    authUrl.searchParams.append('response_type', response_type);
    authUrl.searchParams.append('client_id', client_id);
    authUrl.searchParams.append('redirect_uri', redirect_uri);
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
exports.authTokenPOST = async function (body) {
  const tokenEndpoint = process.env.AUTH0_TOKEN_URL;

  try {
    const response = await axios.post(tokenEndpoint, {
      grant_type: body.grant_type,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri,
    });

    // Cache the token with user info
    await setCache(`token:${response.data.access_token}`, JSON.stringify({
      token: response.data.access_token,
      expires_in: response.data.expires_in,
    }), {
      EX: response.data.expires_in,
    });

    return response.data;
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
exports.usersPOST = function (body) {
  return new Promise(async (resolve, reject) => {
    try {
      // Input validation
      if (!body.email || !body.password || !body.role) {
        reject({ status: 400, message: 'Missing required fields' });
        return;
      }

      if (!['customer', 'store'].includes(body.role)) {
        reject({ status: 400, message: 'Invalid role' });
        return;
      }

      const db = getDB();

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ email: body.email });
      if (existingUser) {
        reject({ status: 409, message: 'User already exists' });
        return;
      }

      // Create user object with required fields
      const newUser = {
        email: body.email,
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
      reject({ status: 500, message: 'Internal server error', error });
    }
  });
};

/**
 * Delete User
 *
 * userId String
 * no response value expected for this operation
 * */
exports.usersUserIdDELETE = function (userId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userId) {
        reject({ status: 400, message: 'User ID is required' });
        return;
      }

      const db = getDB();

      // Soft delete - mark user as inactive instead of removing
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
        reject({ status: 404, message: 'User not found' });
        return;
      }

      resolve({ message: 'User deleted successfully' });
    } catch (error) {
      reject({ status: 500, message: 'Internal server error', error });
    }
  });
};

/**
 * Get User Profile
 *
 * userId String
 * returns User
 * */
exports.usersUserIdGET = function (userId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userId) {
        reject({ status: 400, message: 'User ID is required' });
        return;
      }

      const db = getDB();
      const user = await db.collection('users').findOne({ _id: userId });

      if (!user) {
        reject({ status: 404, message: 'User not found' });
        return;
      }

      // Remove sensitive data before sending
      delete user.password;

      resolve(user);
    } catch (error) {
      reject({ status: 500, message: 'Internal server error', error });
    }
  });
};

/**
 * Update User Profile
 *
 * body UserUpdate
 * userId String
 * returns User
 * */
exports.usersUserIdPUT = function (body, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userId) {
        reject({ status: 400, message: 'User ID is required' });
        return;
      }

      const db = getDB();

      // Validate allowed update fields
      const allowedUpdates = {
        email: body.email,
        preferences: body.preferences,
        privacy_settings: body.privacy_settings,
      };

      // Remove undefined fields
      Object.keys(allowedUpdates).forEach((key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

      if (Object.keys(allowedUpdates).length === 0) {
        reject({ status: 400, message: 'No valid update fields provided' });
        return;
      }

      // Add updated timestamp
      allowedUpdates.updated_at = new Date();

      const result = await db.collection('users').findOneAndUpdate(
        { _id: userId },
        { $set: allowedUpdates },
        { returnDocument: 'after' },
      );

      if (!result.value) {
        reject({ status: 404, message: 'User not found' });
        return;
      }

      // Remove sensitive data before sending
      delete result.value.password;

      resolve(result.value);
    } catch (error) {
      reject({ status: 500, message: 'Internal server error', error });
    }
  });
};
