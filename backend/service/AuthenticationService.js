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

