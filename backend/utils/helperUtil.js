const { getDB } = require('./mongoUtil');

/**
 * Check if a user is already registered as either a user or store
 * @param {string} auth0Id - The Auth0 user ID to check
 * @returns {Promise<{exists: boolean, type?: 'user' | 'store'}>}
 */
exports.checkExistingRegistration = async function checkExistingRegistration(auth0Id) {
  try {
    const db = getDB();

    // Check users collection
    const userExists = await db.collection('users').findOne({ auth0Id });
    if (userExists) {
      return { exists: true, type: 'user' };
    }

    // Check stores collection
    const storeExists = await db.collection('stores').findOne({ auth0Id });
    if (storeExists) {
      return { exists: true, type: 'store' };
    }

    return { exists: false };
  } catch (error) {
    console.error('Registration check failed:', error);
    throw error;
  }
};
