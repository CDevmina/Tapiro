const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { getCache, setCache } = require('../utils/redisUtil');
const axios = require('axios');

exports.updatePreferences = async function updatePreferences(req, userId, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify user permissions
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user) {
        return respondWithCode(404, {
          code: 404,
          message: 'User not found',
        });
      }

      // Update user preferences
      const result = await db
        .collection('users')
        .findOneAndUpdate(
          { email: userData.email },
          { $set: { preferences: body } },
          { returnDocument: 'after' },
        );

      // Invalidate cache
      await setCache(`user:${userId}`, '', { EX: 1 });
      await setCache(`personalized_ads:${userId}`, '', { EX: 1 });

      return respondWithCode(200, result.preferences);
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Preference update failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.logPurchase = async function logPurchase(req, userId, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    const { store_id, items } = body;

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify user
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      // Log purchase
      const purchase = {
        store_id,
        items,
        timestamp: new Date(),
        user_email: userData.email,
      };

      // Add purchase to history and update categories
      const result = await db.collection('users').findOneAndUpdate(
        { email: userData.email },
        {
          $push: { 'preferences.purchase_history': purchase },
          $addToSet: {
            'preferences.categories': {
              $each: items.map((item) => item.category),
            },
          },
        },
        { returnDocument: 'after' },
      );

      if (!result) {
        return respondWithCode(404, {
          code: 404,
          message: 'User not found',
        });
      }

      // Invalidate caches
      await setCache(`user:${userId}`, '', { EX: 1 });
      await setCache(`personalized_ads:${userId}`, '', { EX: 1 });

      return respondWithCode(201, {
        message: 'Purchase logged successfully',
      });
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Purchase logging failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
