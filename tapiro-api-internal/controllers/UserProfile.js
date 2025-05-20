const utils = require('../utils/writer.js');
const UserProfile = require('../service/UserProfileService');

module.exports.getUserProfile = function getUserProfile(req, res, next) {
  UserProfile.getUserProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateUserProfile = function updateUserProfile(req, res, next, body) {
  UserProfile.updateUserProfile(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteUserProfile = function deleteUserProfile(req, res, next) {
  UserProfile.deleteUserProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getRecentUserData = function getRecentUserData(req, res, next, limit, page) {
  const { dataType, storeId, startDate, endDate, searchTerm } = req.query;
  UserProfile.getRecentUserData(req, limit, page, dataType, storeId, startDate, endDate, searchTerm)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getSpendingAnalytics = function getSpendingAnalytics(req, res, next) {
  UserProfile.getSpendingAnalytics(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteUserDataHistory = function deleteUserDataHistory(req, res, next, body) {
  UserProfile.deleteUserDataHistory(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};