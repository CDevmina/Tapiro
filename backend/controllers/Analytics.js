const utils = require('../utils/writer.js');
const Analytics = require('../service/AnalyticsService');

module.exports.getEngagement = function getEngagement(req, res, next) {
  const { storeId } = req.params;
  Analytics.getEngagement(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getDemographics = function getDemographics(req, res, next) {
  const { storeId } = req.params;
  Analytics.getDemographics(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
