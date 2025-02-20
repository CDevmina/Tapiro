const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');

/**
 * Register User
 * Create a new user (customer or store).
 *
 * body UserCreate
 * returns User
 * */
exports.usersPOST = async function usersPOST(body) {
  try {
    const db = getDB();
    const { role } = body;

    // Get user info from Auth0
    const auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
      headers: { Authorization: `Bearer ${body.access_token}` },
    });

    const userData = auth0Response.data;

    // Assign role in Auth0
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

    const result = await db.collection('users').insertOne(user);

    // Cache user data
    await setCache(`user:${result.insertedId}`, JSON.stringify(user), {
      EX: 3600, // Cache for 1 hour
    });

    return { ...user, id: result.insertedId };
  } catch (error) {
    console.error('User registration failed:', error);
    throw { code: 400, message: error.message };
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
