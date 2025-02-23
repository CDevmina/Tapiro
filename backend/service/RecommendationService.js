const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { getCache, setCache } = require('../utils/redisUtil');
const axios = require('axios');

exports.getPersonalizedAds = async function getPersonalizedAds(req, userId) {
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

      // Check cache for personalized ads
      const cachedAds = await getCache(`personalized_ads:${userId}`);
      if (cachedAds) {
        return respondWithCode(200, JSON.parse(cachedAds));
      }

      // Get user preferences and purchase history
      const preferences = user.preferences || { categories: [] };
      const purchaseHistory = user.purchase_history || [];

      // Get all active ads
      const ads = await db
        .collection('advertisements')
        .find({
          'validity_period.start': { $lte: new Date() },
          'validity_period.end': { $gte: new Date() },
        })
        .toArray();

      // Filter and score ads based on user preferences
      const scoredAds = ads.map((ad) => {
        let score = 0;

        // Score based on category matches
        const categoryMatches = ad.target_categories.filter((cat) =>
          preferences.categories.includes(cat),
        ).length;
        score += categoryMatches * 2;

        // Score based on purchase history
        const purchaseMatches = purchaseHistory.filter((purchase) =>
          ad.target_categories.includes(purchase.category),
        ).length;
        score += purchaseMatches;

        return { ...ad, score };
      });

      // Sort by score and take top results
      const personalizedAds = scoredAds
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ score, ...ad }) => ad);

      // Cache the results
      await setCache(`personalized_ads:${userId}`, JSON.stringify(personalizedAds), {
        EX: 3600, // Cache for 1 hour
      });

      return respondWithCode(200, {
        user_id: userId,
        ads: personalizedAds,
      });
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Personalization failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.triggerRecommendations = async function triggerRecommendations(req, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];
    const { user_id, store_id } = body;

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify store permissions
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user || user.role !== 'store') {
        return respondWithCode(403, {
          code: 403,
          message: 'Insufficient permissions',
        });
      }

      // Invalidate existing cache
      await setCache(`personalized_ads:${user_id}`, '', { EX: 1 });

      // Queue recommendation generation (simulated)
      setTimeout(async () => {
        try {
          // Get user data
          const targetUser = await db.collection('users').findOne({ _id: user_id });
          if (!targetUser) return;

          // Get store ads
          const ads = await db
            .collection('advertisements')
            .find({
              storeId: store_id,
              'validity_period.end': { $gte: new Date() },
            })
            .toArray();

          // Generate personalized recommendations
          const recommendations = ads.filter((ad) =>
            ad.target_categories.some((cat) => targetUser.preferences.categories.includes(cat)),
          );

          // Cache new recommendations
          await setCache(`personalized_ads:${user_id}`, JSON.stringify(recommendations), {
            EX: 3600,
          });
        } catch (error) {
          console.error('Async recommendation generation failed:', error);
        }
      }, 0);

      return respondWithCode(202, {
        message: 'Recommendation generation initiated',
        user_id,
        store_id,
      });
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Recommendation trigger failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
