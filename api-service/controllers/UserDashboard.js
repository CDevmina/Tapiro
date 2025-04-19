const utils = require('../utils/writer.js');
const UserDashboard = require('../service/UserDashboardService');

module.exports.getUsageSummary = function getUsageSummary(req, res, next) {
  UserDashboard.getUsageSummary(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getSpendingAnalytics = function getSpendingAnalytics(req, res, next) {
  UserDashboard.getSpendingAnalytics(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getRecentData = function getRecentData(req, res, next) {
  // Pass query parameters to the service
  const limit = req.query.limit;
  UserDashboard.getRecentData(req, limit)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getConsentingStores = function getConsentingStores(req, res, next) {
  UserDashboard.getConsentingStores(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};