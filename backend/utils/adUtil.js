/**
 * Calculate personalization score for an ad based on user data
 * @param {Object} ad - Advertisement object
 * @param {Object} user - User object with preferences
 * @returns {number} - Calculated score
 */
exports.calculateAdScore = function calculateAdScore(ad, user) {
  let score = 0;

  // Rule 1: Match with user preferences (highest weight)
  ad.target_categories.forEach((category) => {
    if (user.preferences?.categories?.includes(category)) {
      score += 5;
    }
  });

  // Rule 2: Match with purchase history
  user.preferences?.purchase_history?.forEach((purchase) => {
    purchase.items.forEach((item) => {
      if (ad.target_categories.includes(item.category)) {
        score += 3;
      }
    });
  });

  // Rule 3: Ad freshness
  const daysRemaining = (new Date(ad.validity_period.end) - new Date()) / (1000 * 3600 * 24);
  score += Math.max(0, daysRemaining * 0.1);

  return score;
};

/**
 * Filter and sort ads based on scoring
 * @param {Array} ads - List of ads to rank
 * @param {Object} user - User to personalize for
 * @param {number} limit - Maximum number of ads to return
 * @returns {Array} - Ranked and filtered ads
 */
exports.rankAds = function rankAds(ads, user, limit = 5) {
  return ads
    .map((ad) => ({
      ...ad,
      score: exports.calculateAdScore(ad, user),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...ad }) => ad);
};
