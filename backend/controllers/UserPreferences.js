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

module.exports.deleteUserData = function deleteUserData(req, res, next, userId) {
  UserPreferences.deleteUserData(req, userId)
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
