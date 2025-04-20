const axios = require('axios');
const { getCache, setCache } = require('./redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('./cacheConfig');

async function getManagementToken() {
  try {
    // Check cache first
    const cachedToken = await getCache(CACHE_KEYS.ADMIN_TOKEN);
    if (cachedToken) {
      return cachedToken;
    }

    // Get new token using M2M credentials
    const response = await axios.post(
      `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
      {
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        grant_type: 'client_credentials',
        scope: 'read:users update:users create:users',
      },
      {
        headers: { 'content-type': 'application/json' },
      },
    );

    const token = response.data.access_token;

    // Cache the token
    await setCache(CACHE_KEYS.ADMIN_TOKEN, token, {
      EX: CACHE_TTL.ADMIN_TOKEN,
    });

    return token;
  } catch (error) {
    console.error('Failed to get management token:', error?.response?.data || error);
    throw error;
  }
}

async function assignUserRole(userId, role) {
  try {
    const token = await getManagementToken();

    const roleId =
      role === 'store' ? process.env.AUTH0_STORE_ROLE_ID : process.env.AUTH0_USER_ROLE_ID;

    await axios.post(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}/roles`,
      { roles: [roleId] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Failed to assign role:', error?.response?.data || error);
    throw error;
  }
}

/**
 * Links two user accounts in Auth0
 * @param {string} primaryUserId - The main user ID (to keep)
 * @param {string} secondaryUserId - The user ID to link to primary
 * @returns {Promise<Object>} - The linked user data
 */
async function linkAccounts(primaryUserId, secondaryUserId) {
  try {
    const token = await getManagementToken();

    // Get the secondary user's identity provider data
    const secondaryUserResponse = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${secondaryUserId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const secondaryUser = secondaryUserResponse.data;
    if (!secondaryUser.identities || !secondaryUser.identities.length) {
      throw new Error('No identities found on secondary account');
    }

    // Get the provider connection info
    const identity = secondaryUser.identities[0];
    const provider = identity.provider;
    const userId = identity.user_id;

    // Link the accounts
    const response = await axios.post(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${primaryUserId}/identities`,
      { provider, user_id: userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Account linking failed:', error?.response?.data || error);
    throw error;
  }
}

/**
 * Update Auth0 user metadata
 * @param {string} userId - Auth0 user ID
 * @param {Object} metadata - Metadata to update
 * @param {boolean} invalidateUserCache - Whether to invalidate the user cache
 * @returns {Promise<Object>} - Updated metadata
 */
async function updateUserMetadata(userId, metadata, invalidateUserCache = false) {
  try {
    const token = await getManagementToken();
    
    const metadataUpdate = {
      user_metadata: metadata
    };

    // Update user metadata in Auth0
    const response = await axios.patch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      metadataUpdate,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Invalidate cache if requested
    if (invalidateUserCache) {
      const { invalidateCache } = require('../utils/redisUtil');
      const { CACHE_KEYS } = require('../utils/cacheConfig');
      await invalidateCache(`${CACHE_KEYS.USER_DATA}${userId}`);
    }
    
    return response.data.user_metadata || {};
  } catch (error) {
    console.error('Failed to update user metadata:', error?.response?.data || error);
    throw error;
  }
}

/**
 * Update Auth0 user phone number
 * @param {string} userId - Auth0 user ID
 * @param {string} phone - New phone number
 * @returns {Promise<Object>} - Updated user data from Auth0
 */
async function updateUserPhone(userId, phone) {
  try {
    const token = await getManagementToken();

    const phoneUpdate = {
      phone_number: phone,
      // Consider if phone_verified should be reset here
      phone_verified: false,
    };

    // Update user phone number in Auth0
    const response = await axios.patch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      phoneUpdate,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Failed to update Auth0 phone number for ${userId}:`, error?.response?.data || error.message);
    // Re-throw the error so the calling service can decide how to handle it
    throw error;
  }
}

/**
 * Get Auth0 user metadata
 * @param {string} userId - Auth0 user ID
 * @returns {Promise<Object>} - User metadata
 */
async function getUserMetadata(userId) {
  try {
    const token = await getManagementToken();
    
    // Get user with metadata from Auth0 Management API
    const response = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.user_metadata || {};
  } catch (error) {
    console.error('Failed to get user metadata:', error?.response?.data || error);
    throw error;
  }
}

/**
 * Update Auth0 user's root username attribute (for database connections)
 * @param {string} userId - Auth0 user ID
 * @param {string} newUsername - The new username
 * @returns {Promise<Object>} - Updated user data from Auth0
 */
async function updateAuth0Username(userId, newUsername) {
  try {
    const token = await getManagementToken();

    const usernameUpdate = {
      username: newUsername,
      // Note: You might need to consider connection-specific rules here.
      // For Auth0 database connections, 'username' is the field.
    };

    // Update username using the Management API
    const response = await axios.patch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      usernameUpdate,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Successfully updated Auth0 username for ${userId}.`);
    return response.data;
  } catch (error) {
    // Log the specific error (e.g., username already exists)
    console.error(`Failed to update Auth0 username for ${userId}:`, error?.response?.data || error.message);
    // Re-throw the error so the calling service knows the update failed
    throw error;
  }
}

/**
 * Delete a user from Auth0
 * @param {string} userId - Auth0 user ID
 * @returns {Promise<void>}
 */
async function deleteAuth0User(userId) {
  try {
    const token = await getManagementToken();

    // Delete user from Auth0
    await axios.delete(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(`Successfully deleted user ${userId} from Auth0.`);
  } catch (error) {
    // Log error but don't throw, allowing the calling service to continue if needed
    console.error(`Auth0 deletion failed for user ${userId}:`, error?.response?.data || error.message);
    // If you want the deletion failure to stop the process in the service, re-throw the error:
    // throw error;
  }
}

module.exports = { 
  getManagementToken, 
  assignUserRole, 
  linkAccounts,
  updateUserMetadata,
  updateUserPhone,
  getUserMetadata,
  updateAuth0Username, // <-- Export the new function
  deleteAuth0User,
};
