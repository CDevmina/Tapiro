const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { checkExistingRegistration } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');
const { assignUserRole, updateUserMetadata, getUserMetadata } = require('../utils/auth0Util'); // Removed linkAccounts
const { getUserData } = require('../utils/authUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

/**
 * Register User
 * Create a new regular user account
 */
exports.registerUser = async function (req, body) {
  try {
    const db = getDB();
    const {
      username,
      preferences,
      dataSharingConsent,
      allowInference,
      gender,
      incomeBracket,
      country,
      age,
    } = body;

    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const registration = await checkExistingRegistration(userData.sub);
    if (registration.exists) {
      return respondWithCode(409, {
        code: 409,
        message: `This account is already registered as a ${registration.type}`,
      });
    }

    // Check if email already exists in users or stores collection
    const existingEmail =
      (await db.collection('users').findOne({ email: userData.email })) ||
      (await db.collection('stores').findOne({ email: userData.email }));
    if (existingEmail) {
      return respondWithCode(409, {
        code: 409,
        message: 'Email is already registered with another account.',
      });
    }

    const existingUserByUsername = await db.collection('users').findOne({
      username: username,
    });

    if (existingUserByUsername) {
      return respondWithCode(409, {
        code: 409,
        message: 'Username already taken',
      });
    }

    await assignUserRole(userData.sub, 'user');

    const user = {
      auth0Id: userData.sub,
      username: username || null,
      email: userData.email,
      phone: userData.phone_number || null,
      demographicData: {
        gender: gender || null,
        incomeBracket: incomeBracket || null,
        country: country || null,
        age: age || null,
        hasKids: null,
        relationshipStatus: null,
        employmentStatus: null,
        educationLevel: null,
        inferredHasKids: null,
        inferredRelationshipStatus: null,
        inferredEmploymentStatus: null,
        inferredEducationLevel: null,
        inferredGender: null,
      },
      preferences: preferences || [],
      privacySettings: {
        dataSharingConsent,
        anonymizeData: false,
        allowInference: allowInference !== undefined ? allowInference : true,
        optInStores: [],
        optOutStores: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    const result = await db.collection('users').insertOne(user);

    const userWithId = { ...user, _id: result.insertedId };
    await setCache(`${CACHE_KEYS.USER_DATA}${userData.sub}`, JSON.stringify(userWithId), {
      EX: CACHE_TTL.USER_DATA,
    });

    const cachePreferences = {
      userId: user._id.toString(),
      preferences: user.preferences || [],
      updatedAt: user.updatedAt || new Date(),
    };

    await setCache(`${CACHE_KEYS.PREFERENCES}${userData.sub}`, JSON.stringify(cachePreferences), {
      EX: CACHE_TTL.USER_DATA,
    });

    await updateUserMetadata(userData.sub, {
      registrationType: 'user',
      registrationComplete: true,
      nickname: username,
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

    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    const registration = await checkExistingRegistration(userData.sub);
    if (registration.exists) {
      return respondWithCode(409, {
        code: 409,
        message: `This account is already registered as a ${registration.type}`,
      });
    }

    // Check if email already exists in users or stores collection
    const existingEmail =
      (await db.collection('users').findOne({ email: userData.email })) ||
      (await db.collection('stores').findOne({ email: userData.email }));
    if (existingEmail) {
      return respondWithCode(409, {
        code: 409,
        message: 'Email is already registered with another account.',
      });
    }

    await assignUserRole(userData.sub, 'store');

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

    const storeWithId = { ...store, _id: result.insertedId };
    await setCache(`${CACHE_KEYS.STORE_DATA}${userData.sub}`, JSON.stringify(storeWithId), {
      EX: CACHE_TTL.STORE_DATA,
    });

    await updateUserMetadata(userData.sub, {
      registrationType: 'store',
      registrationComplete: true,
      nickname: name,
    });

    return respondWithCode(201, { ...store, storeId: result.insertedId });
  } catch (error) {
    console.error('Store registration failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};

/**
 * Get user metadata
 * Retrieve Auth0 metadata for the authenticated user
 */
exports.getUserMetadata = async function (req) {
  try {
    // Get user data from middleware or fetch it
    const userData = req.user || (await getUserData(req.headers.authorization?.split(' ')[1]));

    // Get user metadata from Auth0 using Management API
    const metadata = await getUserMetadata(userData.sub);

    return respondWithCode(200, { metadata });
  } catch (error) {
    console.error('Metadata retrieval failed:', error);
    return respondWithCode(500, { code: 500, message: 'Internal server error' });
  }
};
