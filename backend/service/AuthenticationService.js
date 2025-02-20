const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');

/**
 * Register User
 * Create a new user (user or store).
 *
 * body UserCreate
 * returns User
 * */
exports.usersPOST = async function usersPOST(req, body) {
  try {
    const db = getDB();
    const { role } = body;

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let auth0Response;
    try {
      auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (authError) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid authentication token',
      });
    }

    const userData = auth0Response.data;

    // Assign role in Auth0
    try {
      await axios.post(
        `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}/roles`,
        {
          roles: [
            role === 'store' ? process.env.AUTH0_STORE_ROLE_ID : process.env.AUTH0_USER_ROLE_ID,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH0_MANAGEMENT_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (roleError) {
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to assign user role',
      });
    }

    // Create user in MongoDB
    const user = {
      email: userData.email,
      role: role,
      privacy_settings: {
        data_sharing: true,
        anonymized_id: generateAnonymizedId(),
      },
      preferences: {
        categories: [],
        purchase_history: [],
      },
    };

    let result;
    try {
      result = await db.collection('users').insertOne(user);
    } catch (dbError) {
      return respondWithCode(500, {
        code: 500,
        message: 'Database operation failed',
      });
    }

    // Cache user data
    try {
      await setCache(`user:${result.insertedId}`, JSON.stringify(user), {
        EX: 3600, // Cache for 1 hour
      });
    } catch (cacheError) {
      console.error('Cache operation failed:', cacheError);
      // Continue even if cache fails
    }

    // Return 201 Created for successful user creation
    return respondWithCode(201, {
      ...user,
      id: result.insertedId,
    });
  } catch (error) {
    console.error('User registration failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete User
 *
 * userId String
 * no response value expected for this operation
 * */
exports.usersUserIdDELETE = function usersUserIdDELETE(userId) {
  return new Promise((resolve, reject) => {});
};

/**
 * Get User Profile
 *
 * userId String
 * returns User
 * */
exports.usersUserIdGET = function usersUserIdGET(userId) {
  return new Promise((resolve, reject) => {});
};

/**
 * Update User Profile
 *
 * body UserUpdate
 * userId String
 * returns User
 * */
exports.usersUserIdPUT = function usersUserIdPUT(body, userId) {
  return new Promise((resolve, reject) => {});
};
