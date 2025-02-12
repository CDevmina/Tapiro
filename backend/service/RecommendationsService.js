const { getDB } = require('../utils/mongoUtil');

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
          const err = new Error('User ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Get user preferences
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
          const err = new Error('User not found');
          err.status = 404;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
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
          const err = new Error('User ID and Store ID are required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Verify user and store exist
        const [user, store] = await Promise.all([
          db.collection('users').findOne({ _id: body.user_id }),
          db.collection('users').findOne({ _id: body.store_id, role: 'store' }),
        ]);

        if (!user || !store) {
          const err = new Error('User or Store not found');
          err.status = 404;
          reject(err);
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
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};
