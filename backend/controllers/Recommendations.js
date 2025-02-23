const utils = require('../utils/writer.js');
const Recommendations = require('../service/RecommendationService');

module.exports.getPersonalizedAds = function getPersonalizedAds(req, res, next) {
  const { userId } = req.params;
  Recommendations.getPersonalizedAds(req, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.triggerRecommendations = function triggerRecommendations(req, res, next, body) {
  Recommendations.triggerRecommendations(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
