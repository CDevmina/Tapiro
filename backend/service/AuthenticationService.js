const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, client } = require('../utils/redisUtil');
const { checkExistingRegistration } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');
const { assignUserRole, getManagementToken, linkAccounts } = require('../utils/auth0Util');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Register User
 * Create a new regular user account
 */
exports.registerUser = async function (req, body) {
  try {
    const db = getDB();
    const { phone, preferences, dataSharingConsent } = body;

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);
    
    // Check if email already exists in our database
    const existingUserByEmail = await db.collection('users').findOne({
      email: userData.email,
    });

    // Handle account linking if the email exists but with a different auth0Id
    if (existingUserByEmail && existingUserByEmail.auth0Id !== userData.sub) {
      try {
        // Link the accounts in Auth0
        await linkAccounts(existingUserByEmail.auth0Id, userData.sub);

        // Return the existing user
        return respondWithCode(200, {
          ...existingUserByEmail,
          message: 'Account linked successfully',
          accountLinked: true,
        });
      } catch (linkError) {
        console.error('Account linking failed:', linkError);
        return respondWithCode(400, {
          code: 400,
          message: 'Failed to link accounts. Please contact support.',
          details: linkError.message,
        });
      }
    }

    // Check if username already exists
    const existingUserByUsername = await db.collection('users').findOne({
      username: userData.nickname,
    });

    if (existingUserByUsername) {
      return respondWithCode(409, {
        code: 409,
        message: 'Username already taken',
      });
    }

    // Create user in database
    const user = {
      auth0Id: userData.sub,
      username: userData.nickname,
      email: userData.email,
      phone,
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
 */
exports.registerStore = async function (req, body) {
  try {
    const db = getDB();
    const { name, address, webhooks } = body;

    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

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
      address,
      webhooks: webhooks || [],
      apiKeys: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
 */
exports.getUserProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Try cache first using standardized cache key
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    const cachedUser = await getCache(cacheKey);
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

    // Cache the result with standardized TTL
    await setCache(cacheKey, JSON.stringify(user), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, user);
  } catch (error) {
    console.error('Get profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update User Profile
 * Update authenticated user's profile
 */
exports.updateUserProfile = async function (req, body) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // If username is being updated, check for uniqueness
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

    // Update user
    const updateData = {
      ...body,
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

    // Update cache with standardized key and TTL
    const cacheKey = `${CACHE_KEYS.USER_DATA}${userData.sub}`;
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.USER_DATA });
    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete User Profile
 * Delete authenticated user's profile
 */
exports.deleteUserProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

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

    // Clear cache using standardized key
    await client.del(`${CACHE_KEYS.USER_DATA}${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get Store Profile
 * Get authenticated store's profile
 */
exports.getStoreProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Try cache first using standardized cache key
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    const cachedStore = await getCache(cacheKey);
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

    // Cache the result with standardized TTL
    await setCache(cacheKey, JSON.stringify(store), { EX: CACHE_TTL.STORE_DATA });
    return respondWithCode(200, store);
  } catch (error) {
    console.error('Get store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Update Store Profile
 * Update authenticated store's profile
 */
exports.updateStoreProfile = async function (req, body) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

    // Update store
    const { name, address, webhooks } = body;
    const updateData = {
      name,
      address,
      webhooks,
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

    // Update cache with standardized key and TTL
    const cacheKey = `${CACHE_KEYS.STORE_DATA}${userData.sub}`;
    await setCache(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.STORE_DATA });
    return respondWithCode(200, result);
  } catch (error) {
    console.error('Update store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Delete Store Profile
 * Delete authenticated store's profile
 */
exports.deleteStoreProfile = async function (req) {
  try {
    const db = getDB();
    
    // Get user data - use req.user if available (from middleware) or fetch it
    const userData = req.user || await getUserData(req.headers.authorization?.split(' ')[1]);

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

    // Clear cache using standardized key
    await client.del(`${CACHE_KEYS.STORE_DATA}${userData.sub}`);
    return respondWithCode(204);
  } catch (error) {
    console.error('Delete store profile failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};