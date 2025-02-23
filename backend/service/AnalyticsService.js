const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { getCache, setCache } = require('../utils/redisUtil');
const axios = require('axios');

exports.getEngagement = async function getEngagement(req, storeId) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

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

      // Check cache first
      const cachedAnalytics = await getCache(`analytics:engagement:${storeId}`);
      if (cachedAnalytics) {
        return respondWithCode(200, JSON.parse(cachedAnalytics));
      }

      // Get all ads for the store
      const ads = await db.collection('advertisements').find({ storeId }).toArray();

      // Calculate engagement metrics
      const analytics = {
        top_categories: await getTopCategories(db, storeId),
        avg_engagement_time: await calculateAverageEngagement(db, storeId),
        total_impressions: await calculateImpressions(db, storeId),
        click_through_rate: await calculateCTR(db, storeId),
        active_campaigns: ads.filter((ad) => new Date(ad.validity_period.end) >= new Date()).length,
      };

      // Cache the results
      await setCache(`analytics:engagement:${storeId}`, JSON.stringify(analytics), {
        EX: 3600, // Cache for 1 hour
      });

      return respondWithCode(200, analytics);
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Analytics retrieval failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.getDemographics = async function getDemographics(req, storeId) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

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

      // Check cache first
      const cachedDemographics = await getCache(`analytics:demographics:${storeId}`);
      if (cachedDemographics) {
        return respondWithCode(200, JSON.parse(cachedDemographics));
      }

      // Get user interactions with store
      const demographics = {
        user_preferences: await getUserPreferences(db, storeId),
        purchase_patterns: await getPurchasePatterns(db, storeId),
        interaction_times: await getInteractionTimes(db, storeId),
        recurring_customers: await getRecurringCustomers(db, storeId),
      };

      // Cache the results
      await setCache(`analytics:demographics:${storeId}`, JSON.stringify(demographics), {
        EX: 3600, // Cache for 1 hour
      });

      return respondWithCode(200, demographics);
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Demographics retrieval failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

// Helper functions for analytics calculations
async function getTopCategories(db, storeId) {
  const pipeline = [
    { $match: { 'preferences.purchase_history.store_id': storeId } },
    { $unwind: '$preferences.categories' },
    {
      $group: {
        _id: '$preferences.categories',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ];

  const categories = await db.collection('users').aggregate(pipeline).toArray();
  return categories.map((c) => c._id);
}

async function calculateAverageEngagement(db, storeId) {
  // Simplified example - in practice, you'd track actual engagement times
  return Math.random() * 300; // Random number between 0-300 seconds
}

async function calculateImpressions(db, storeId) {
  const result = await db.collection('advertisements').find({ storeId }).toArray();

  return result.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
}

async function calculateCTR(db, storeId) {
  const ads = await db.collection('advertisements').find({ storeId }).toArray();

  const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);

  return totalImpressions > 0 ? totalClicks / totalImpressions : 0;
}

async function getUserPreferences(db, storeId) {
  const pipeline = [
    { $match: { 'preferences.purchase_history.store_id': storeId } },
    {
      $group: {
        _id: null,
        categories: { $addToSet: '$preferences.categories' },
      },
    },
  ];

  const result = await db.collection('users').aggregate(pipeline).toArray();
  return result[0]?.categories || [];
}

async function getPurchasePatterns(db, storeId) {
  const pipeline = [
    { $match: { 'preferences.purchase_history.store_id': storeId } },
    { $unwind: '$preferences.purchase_history' },
    {
      $group: {
        _id: { $dayOfWeek: '$preferences.purchase_history.timestamp' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ];

  return db.collection('users').aggregate(pipeline).toArray();
}

async function getInteractionTimes(db, storeId) {
  // Simplified - in practice, you'd track actual interaction timestamps
  return {
    peak_hours: ['14:00', '18:00'],
    slow_hours: ['03:00', '04:00'],
  };
}

async function getRecurringCustomers(db, storeId) {
  const pipeline = [
    { $match: { 'preferences.purchase_history.store_id': storeId } },
    {
      $group: {
        _id: '$email',
        visits: { $sum: 1 },
      },
    },
    { $match: { visits: { $gt: 1 } } },
    { $count: 'recurring_customers' },
  ];

  const result = await db.collection('users').aggregate(pipeline).toArray();
  return result[0]?.recurring_customers || 0;
}
