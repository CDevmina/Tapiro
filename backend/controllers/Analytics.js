const utils = require('../utils/writer.js');
const Analytics = require('../service/AnalyticsService');

module.exports.getEngagement = function getEngagement(req, res, next, storeId) {
  Analytics.getEngagement(storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getDemographics = function getDemographics(req, res, next, storeId) {
  Analytics.getDemographics(storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
