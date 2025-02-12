const utils = require('../utils/writer.js');
const Recommendations = require('../service/RecommendationsService');

module.exports.getPersonalizedAds = function getPersonalizedAds(req, res, next, userId) {
  Recommendations.getPersonalizedAds(userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.triggerRecommendations = function triggerRecommendations(req, res, next, body) {
  Recommendations.triggerRecommendations(body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
