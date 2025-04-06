const utils = require('../utils/writer.js');
const PreferenceManagement = require('../service/PreferenceManagementService');

module.exports.getUserOwnPreferences = function getUserOwnPreferences(req, res, next) {
  PreferenceManagement.getUserOwnPreferences(req)
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

module.exports.optInToStore = function optInToStore(req, res, next, storeId) {
  PreferenceManagement.optInToStore(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.optOutFromStore = function optOutFromStore(req, res, next, storeId) {
  PreferenceManagement.optOutFromStore(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};