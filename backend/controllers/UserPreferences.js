const utils = require('../utils/writer.js');
const UserPreferences = require('../service/UserPreferencesService');

module.exports.getUserPreferences = function getUserPreferences(req, res, next, userId) {
  UserPreferences.getUserPreferences(req, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.optOutFromStore = function optOutFromStore(req, res, next, body) {
  UserPreferences.optOutFromStore(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.submitUserData = function submitUserData(req, res, next, body) {
  UserPreferences.submitUserData(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
