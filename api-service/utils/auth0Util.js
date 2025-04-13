const axios = require('axios');
const { getCache, setCache, invalidateCache } = require('./redisUtil'); // Ensure invalidateCache is imported if used
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

/**
 * Get full user profile from Auth0 Management API
 * @param {string} userId - Auth0 user ID
 * @returns {Promise<Object>} - Full user profile from Auth0
 */
async function getUser(userId) {
  try {
    const token = await getManagementToken();
    const response = await axios.get(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to get user ${userId}:`, error?.response?.data || error);
    // Re-throw the error so the caller can handle it (e.g., return 404 or 500)
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
    
    // Invalidate cache if requested - Ensure this uses the correct key format if getUserData cache is still relevant elsewhere
    if (invalidateUserCache) {
       // Assuming the cache key for getUserData used the access token, not user ID.
       // Invalidating based on userId might require a different strategy or might not be needed
       // if getUserData cache is no longer the primary source for metadata checks.
       // Consider if you need to invalidate a cache based on userId here.
       // Example: await invalidateCache(`${CACHE_KEYS.USER_PROFILE}${userId}`); // If you cache profiles by ID
    }
    
    return response.data.user_metadata || {};
  } catch (error) {
    console.error('Failed to update user metadata:', error?.response?.data || error);
    throw error;
  }
}

module.exports = { 
  getManagementToken, 
  getUser, // Export the new function
  assignUserRole, 
  linkAccounts,
  updateUserMetadata 
};
