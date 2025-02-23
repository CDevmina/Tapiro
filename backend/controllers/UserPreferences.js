const utils = require('../utils/writer.js');
const UserPreferences = require('../service/UserPreferencesService');

module.exports.updatePreferences = function updatePreferences(req, res, next, body) {
  const { userId } = req.params;
  UserPreferences.updatePreferences(req, userId, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.logPurchase = function logPurchase(req, res, next, body) {
  const { userId } = req.params;
  UserPreferences.logPurchase(req, userId, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
