const { getDB } = require('../utils/mongoUtil');
const { setCache} = require('../utils/redisUtil');
const { checkExistingRegistration } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');
const { assignUserRole, linkAccounts } = require('../utils/auth0Util');
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Register User
 * Create a new regular user account
 */
exports.registerUser = async function (req, body) {
  try {
    const db = getDB();
    const { preferences, dataSharingConsent } = body;

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

        // Cache the linked user data
        await setCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`, JSON.stringify(existingUserByEmail), {
          EX: CACHE_TTL.USER_DATA
        });

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

    // Add user role assignment
    try {
      await assignUserRole(userData.sub, 'user');
    } catch (error) {
      console.error('Role assignment failed:', error);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to assign role',
      });
    }

    // Create user in database
    const user = {
      auth0Id: userData.sub,
      username: userData.nickname,
      email: userData.email,
      phone: userData.phone_number || null, 
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
    
    // Cache the newly created user data
    const userWithId = { ...user, _id: result.insertedId };
    await setCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`, JSON.stringify(userWithId), {
      EX: CACHE_TTL.USER_DATA
    });
    
    // Also cache user preferences
    const cachePreferences = { 
      userId: result.insertedId.toString(),
      interests: user.preferences || [],
      privacySettings: user.privacySettings,
      demographics: user.demographics || {
        ageRange: 'unknown',
        location: 'unknown'
      }
    };
    
    await setCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`, JSON.stringify(cachePreferences), {
      EX: CACHE_TTL.USER_DATA
    });

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

    // Check if a store with the same email exists but with different auth0Id
    const existingStoreByEmail = await db.collection('stores').findOne({
      email: userData.email,
    });

    // Handle account linking if the email exists but with a different auth0Id
    if (existingStoreByEmail && existingStoreByEmail.auth0Id !== userData.sub) {
      try {
        // Link the accounts in Auth0
        await linkAccounts(existingStoreByEmail.auth0Id, userData.sub);

        // Cache the linked store data
        await setCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`, JSON.stringify(existingStoreByEmail), {
          EX: CACHE_TTL.STORE_DATA
        });

        // Return the existing store
        return respondWithCode(200, {
          ...existingStoreByEmail,
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
      email: userData.email,
      webhooks: webhooks || [],
      apiKeys: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('stores').insertOne(store);
    
    // Cache the newly created store data
    const storeWithId = { ...store, _id: result.insertedId };
    await setCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`, JSON.stringify(storeWithId), {
      EX: CACHE_TTL.STORE_DATA
    });
    
    return respondWithCode(201, { ...store, storeId: result.insertedId });
  } catch (error) {
    console.error('Store registration failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

