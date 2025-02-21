const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache, getCache, client } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');
const { respondWithCode } = require('../utils/writer');

/**
 * Register User
 * Create a new user (user or store).
 *
 * body UserCreate
 * returns User
 * */
exports.usersPOST = async function usersPOST(req, body) {
  try {
    const db = getDB();
    const { role } = body;

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let auth0Response;
    try {
      auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (authError) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid authentication token',
      });
    }

    const userData = auth0Response.data;

    try {
      const existingUser = await db.collection('users').findOne({ email: userData.email });
      if (existingUser) {
        return respondWithCode(409, {
          code: 409,
          message: 'User already exists',
          error: 'A user with this email is already registered',
        });
      }
    } catch (dbError) {
      console.error('Database lookup failed:', dbError);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to check existing user',
        error: dbError.message,
      });
    }

    // Assign role in Auth0
    try {
      const options = {
        method: 'POST',
        url: `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}/roles`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.AUTH0_MANAGEMENT_API_TOKEN}`,
          'cache-control': 'no-cache',
        },
        data: {
          roles: [
            role === 'store' ? process.env.AUTH0_STORE_ROLE_ID : process.env.AUTH0_USER_ROLE_ID,
          ],
        },
      };

      await axios.request(options);
    } catch (roleError) {
      console.error('Role assignment failed:', roleError.response?.data || roleError.message);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to assign user role',
        error: roleError.response?.data?.message || roleError.message,
      });
    }

    // Create user in MongoDB
    const user = {
      email: userData.email,
      role: role,
      privacy_settings: {
        data_sharing: false,
        anonymized_id: generateAnonymizedId(),
      },
      preferences: {
        categories: [],
        purchase_history: [],
      },
    };

    let result;
    try {
      result = await db.collection('users').insertOne(user);
    } catch (dbError) {
      return respondWithCode(500, {
        code: 500,
        message: 'Database operation failed',
      });
    }

    // Cache user data
    try {
      await setCache(`user:${result.insertedId}`, JSON.stringify(user), {
        EX: 3600, // Cache for 1 hour
      });
    } catch (cacheError) {
      console.error('Cache operation failed:', cacheError);
      // Continue even if cache fails
    }

    // Return 201 Created for successful user creation
    return respondWithCode(201, {
      ...user,
      id: result.insertedId,
    });
  } catch (error) {
    console.error('User registration failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete User
 *
 * userId String
 * no response value expected for this operation
 * */
exports.usersProfileDELETE = async function usersProfileDELETE(req) {
  try {
    const db = getDB();

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let auth0Response;
    try {
      auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (authError) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid authentication token',
      });
    }

    const userData = auth0Response.data;

    // Delete user from database
    try {
      const result = await db.collection('users').deleteOne({ email: userData.email });

      if (result.deletedCount === 0) {
        return respondWithCode(404, {
          code: 404,
          message: 'User not found',
        });
      }

      // Delete from Auth0
      try {
        await axios.delete(`${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${userData.sub}`, {
          headers: {
            authorization: `Bearer ${process.env.AUTH0_MANAGEMENT_API_TOKEN}`,
            'content-type': 'application/json',
          },
        });
      } catch (auth0Error) {
        console.error('Auth0 deletion failed:', auth0Error);
      }

      // Remove from cache using imported client
      try {
        await client.del(`user:${userData.sub}`);
      } catch (cacheError) {
        console.error('Cache deletion failed:', cacheError);
        // Continue even if cache deletion fails
      }

      return respondWithCode(204);
    } catch (dbError) {
      console.error('Database deletion failed:', dbError);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to delete user',
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error('Profile deletion failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
/**
 * Get User Profile
 *
 * userId String
 * returns User
 * */
exports.usersProfileGET = async function usersProfileGET(req) {
  try {
    const db = getDB();

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let auth0Response;
    try {
      auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (authError) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid authentication token',
      });
    }

    const userData = auth0Response.data;

    // Find user in database
    try {
      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user) {
        return respondWithCode(404, {
          code: 404,
          message: 'User not found',
        });
      }

      // Try to get from cache first
      const cachedUser = await getCache(`user:${user._id}`);
      if (cachedUser) {
        return respondWithCode(200, JSON.parse(cachedUser));
      }

      // Cache miss - return from DB and update cache
      await setCache(`user:${user._id}`, JSON.stringify(user), {
        EX: 3600, // Cache for 1 hour
      });

      return respondWithCode(200, user);
    } catch (dbError) {
      console.error('Database lookup failed:', dbError);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to retrieve user',
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error('Profile retrieval failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Update User Profile
 *
 * body UserUpdate
 * userId String
 * returns User
 * */
exports.usersProfilePUT = async function usersProfilePUT(req, body) {
  try {
    const db = getDB();

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Get user info from Auth0
    let auth0Response;
    try {
      auth0Response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (authError) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid authentication token',
      });
    }

    const userData = auth0Response.data;

    // Update user in database
    try {
      const result = await db
        .collection('users')
        .findOneAndUpdate({ email: userData.email }, { $set: body }, { returnDocument: 'after' });

      if (!result) {
        return respondWithCode(404, {
          code: 404,
          message: 'User not found',
        });
      }

      // Update cache
      await setCache(`user:${result._id}`, JSON.stringify(result), {
        EX: 3600, // Cache for 1 hour
      });

      return respondWithCode(200, result);
    } catch (dbError) {
      console.error('Database update failed:', dbError);
      return respondWithCode(500, {
        code: 500,
        message: 'Failed to update user',
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error('Profile update failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
