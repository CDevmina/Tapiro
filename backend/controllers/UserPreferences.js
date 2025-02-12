const utils = require('../utils/writer.js');
const UserPreferences = require('../service/UserPreferencesService');

module.exports.updatePreferences = function updatePreferences(req, res, next, body, userId) {
  UserPreferences.updatePreferences(body, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.logPurchase = function logPurchase(req, res, next, body, userId) {
  UserPreferences.logPurchase(body, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
