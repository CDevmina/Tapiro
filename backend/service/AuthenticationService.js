const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, client } = require('../utils/redisUtil');
const { checkExistingRegistration } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');
const { assignUserRole, getManagementToken } = require('../utils/auth0Util');

/**
 * Register User
 * Create a new regular user account
 *
 * body UserCreate
 * returns User
 **/
exports.registerUser = async function (req, body) {
  try {
    const db = getDB();
    const { username, name, preferences, dataSharingConsent } = body;

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({
      username: username,
    });

    if (existingUser) {
      return respondWithCode(409, {
        code: 409,
        message: 'Username already taken',
      });
    }

    // Create user in database
    const user = {
      auth0Id: userData.sub,
      username,
      name,
      email: userData.email,
      phone: userData.phone_number,
      preferences: preferences || [],
      privacySettings: {
        dataSharingConsent,
        anonymizeData: false,
        optOutStores: [],
      },
      dataAccess: {
        allowedDomains: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    const result = await db.collection('users').insertOne(user);
    return respondWithCode(201, { ...user, userId: result.insertedId });
  } catch (error) {
    console.error('User registration failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
/**
 * Register Store
 * Create a new store account
 *
 * body StoreCreate
 * returns Store
 **/
exports.registerStore = async function (req, body) {
  try {
    const db = getDB();
    const { name, bussinessType, address, dataSharingConsent, webhooks } = body;

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Check if store name already exists
    const existingStore = await db.collection('stores').findOne({
      name: name,
    });

    if (existingStore) {
      return respondWithCode(409, {
        code: 409,
        message: 'Store name already taken',
      });
    }

    // Check if already registered
    const registration = await checkExistingRegistration(userData.sub);
    if (registration.exists) {
      return respondWithCode(409, {
        code: 409,
        message: `This account is already registered as a ${registration.type}`,
      });
    }

    // Assign store role
    try {
      await assignUserRole(userData.sub, 'store');
    } catch (error) {
      console.error('Role assignment failed:', error);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to assign role',
      });
    }

    // Create store in database
    const store = {
      auth0Id: userData.sub,
      name,
      phone: userData.phone_number,
      bussinessType,
      address,
      dataSharingConsent,
      webhooks: webhooks || [],
      apiKeys: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('stores').createIndex({ name: 1 }, { unique: true });

    const result = await db.collection('stores').insertOne(store);
    return respondWithCode(201, { ...store, storeId: result.insertedId });
  } catch (error) {
    console.error('Store registration failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get User Profile
 * Get authenticated user's profile
 *
 * returns User
 **/
exports.getUserProfile = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Try cache first
    const cachedUser = await getCache(`user:${userData.sub}`);
    if (cachedUser) {
      return respondWithCode(200, JSON.parse(cachedUser));
    }

    // Get from database
    const user = await db.collection('users').findOne({ auth0Id: userData.sub });
    if (!user) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Cache the result
    await setCache(`user:${userData.sub}`, JSON.stringify(user), { EX: 3600 });
    return respondWithCode(200, user);
  } catch (error) {
    console.error('Get profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update User Profile
 * Update authenticated user's profile
 *
 * body UserUpdate
 * returns User
 **/
exports.updateUserProfile = async function (req, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Check username uniqueness if being updated
    if (body.username) {
      const existingUser = await db.collection('users').findOne({
        username: body.username,
        auth0Id: { $ne: userData.sub },
      });

      if (existingUser) {
        return respondWithCode(409, {
          code: 409,
          message: 'Username already taken',
        });
      }
    }

    // Construct update data from allowed fields in schema
    const updateData = {
      ...(body.name && { username: body.name }),
      ...(body.preferences && { preferences: body.preferences }),
      ...(body.privacySettings && {
        privacySettings: {
          ...(body.privacySettings.dataSharingConsent !== undefined && {
            dataSharingConsent: body.privacySettings.dataSharingConsent,
          }),
          ...(body.privacySettings.anonymizeData !== undefined && {
            anonymizeData: body.privacySettings.anonymizeData,
          }),
          ...(body.privacySettings.optOutStores && {
            optOutStores: body.privacySettings.optOutStores,
          }),
        },
      }),
      ...(body.dataAccess && {
        dataAccess: {
          ...(body.dataAccess.allowedDomains && {
            allowedDomains: body.dataAccess.allowedDomains,
          }),
        },
      }),
      updatedAt: new Date(),
    };

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { auth0Id: userData.sub },
        { $set: updateData },
        { returnDocument: 'after' },
      );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Update cache
    await setCache(`user:${userData.sub}`, JSON.stringify(result), { EX: 3600 });
    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete User Profile
 * Delete authenticated user's profile
 **/
exports.deleteUserProfile = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Delete from database
    const result = await db.collection('users').deleteOne({ auth0Id: userData.sub });
    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'User not found',
      });
    }

    // Delete from Auth0
    try {
      const managementToken = await getManagementToken();
      await axios.delete(`${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}`, {
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      });
    } catch (error) {
      console.error('Auth0 deletion failed:', error);
    }

    // Clear cache
    await client.del(`user:${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get Store Profile
 * Get authenticated store's profile
 *
 * returns Store
 **/
exports.getStoreProfile = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Try cache first
    const cachedStore = await getCache(`store:${userData.sub}`);
    if (cachedStore) {
      return respondWithCode(200, JSON.parse(cachedStore));
    }

    // Get from database
    const store = await db.collection('stores').findOne({ auth0Id: userData.sub });
    if (!store) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Cache the result
    await setCache(`store:${userData.sub}`, JSON.stringify(store), { EX: 3600 });
    return respondWithCode(200, store);
  } catch (error) {
    console.error('Get store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update Store Profile
 * Update authenticated store's profile
 *
 * body StoreUpdate
 * returns Store
 **/
exports.updateStoreProfile = async function (req, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Check store name uniqueness if being updated
    if (body.name) {
      const existingStore = await db.collection('stores').findOne({
        name: body.name,
        auth0Id: { $ne: userData.sub }, // Exclude current store
      });

      if (existingStore) {
        return respondWithCode(409, {
          code: 409,
          message: 'Store name already taken',
        });
      }
    }

    // Update store
    const updateData = {
      ...(body.name && { name: body.name }), // Also fix the field name here - was "username"
      ...(body.address && { address: body.address }),
      ...(body.webhooks && { webhooks: body.webhooks }),
      updatedAt: new Date(),
    };

    const result = await db
      .collection('stores')
      .findOneAndUpdate(
        { auth0Id: userData.sub },
        { $set: updateData },
        { returnDocument: 'after' },
      );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Update cache
    await setCache(`store:${userData.sub}`, JSON.stringify(result), { EX: 3600 });
    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete Store Profile
 * Delete authenticated store's profile
 **/
exports.deleteStoreProfile = async function (req) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get store info from Auth0
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Delete from database
    const result = await db.collection('stores').deleteOne({ auth0Id: userData.sub });
    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Store not found',
      });
    }

    // Delete from Auth0
    try {
      const managementToken = await getManagementToken();
      await axios.delete(`${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}`, {
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      });
    } catch (error) {
      console.error('Auth0 deletion failed:', error);
    }

    // Clear cache
    await client.del(`store:${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
