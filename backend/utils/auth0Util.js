const axios = require('axios');
const { getCache, setCache } = require('./redisUtil');

async function getManagementToken() {
  try {
    // Check cache first
    const cachedToken = await getCache('auth0_management_token');
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
    await setCache('auth0_management_token', token, {
      EX: 82800, // 23 hours
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

module.exports = { getManagementToken, assignUserRole, linkAccounts };
