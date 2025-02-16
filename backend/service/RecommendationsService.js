const { getDB } = require('../utils/mongoUtil');
const { ApiError } = require('../utils/errorUtil');

/**
 * Get personalized ads for user
 * Returns personalized ads based on user preferences and history
 *
 * userId String User ID
 * returns AdResponse
 */
exports.getPersonalizedAds = function getPersonalizedAds(userId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!userId) {
          reject(ApiError.BadRequest('User ID is required'));
          return;
        }

        const db = getDB();

        // Get user preferences
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
          reject(ApiError.NotFound('User not found'));
          return;
        }

        // Get user's preferred categories
        const userCategories = user.preferences?.categories || [];

        // Find relevant ads matching user categories
        const ads = await db
          .collection('ads')
          .find({
            target_categories: { $in: userCategories },
            'validity_period.end': { $gt: new Date() },
            'validity_period.start': { $lt: new Date() },
          })
          .limit(10)
          .toArray();

        resolve({
          user_id: userId,
          ads: ads,
        });
      } catch (error) {
        console.error('Get personalized ads error:', error);
        reject(ApiError.InternalError('Failed to retrieve personalized ads', error));
      }
    })();
  });
};

/**
 * Trigger recommendations generation
 * Starts the process of generating personalized recommendations
 *
 * body Object Request body
 * returns Object
 */
exports.triggerRecommendations = function triggerRecommendations(body) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!body.user_id || !body.store_id) {
          reject(ApiError.BadRequest('User ID and Store ID are required'));
          return;
        }

        const db = getDB();

        // Verify user and store exist
        const [user, store] = await Promise.all([
          db.collection('users').findOne({ _id: body.user_id }),
          db.collection('users').findOne({ _id: body.store_id, role: 'store' }),
        ]);

        if (!user || !store) {
          reject(ApiError.NotFound('User or Store not found'));
          return;
        }

        // Create recommendation job
        const job = {
          user_id: body.user_id,
          store_id: body.store_id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        };

        await db.collection('recommendation_jobs').insertOne(job);

        // In a real implementation, you would:
        // 1. Queue a background job for ML processing
        // 2. Use user's purchase history and preferences
        // 3. Consider store's ad performance metrics
        // 4. Update recommendations asynchronously

        resolve({
          message: 'Recommendation generation started',
          job_id: job._id,
        });
      } catch (error) {
        console.error('Trigger recommendations error:', error);
        reject(ApiError.InternalError('Failed to trigger recommendations generation', error));
      }
    })();
  });
};
