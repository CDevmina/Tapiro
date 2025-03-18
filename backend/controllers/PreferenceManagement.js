const utils = require('../utils/writer.js');
const PreferenceManagement = require('../service/PreferenceManagementService');

module.exports.getUserPreferences = function getUserPreferences(req, res, next, userId) {
  PreferenceManagement.getUserPreferences(req, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateUserPreferences = function updateUserPreferences(req, res, next, body) {
  PreferenceManagement.updateUserPreferences(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.optInToStore = function optInToStore(req, res, next, body) {
  PreferenceManagement.optInToStore(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.optOutFromStore = function optOutFromStore(req, res, next, body) {
  PreferenceManagement.optOutFromStore(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};