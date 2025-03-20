const utils = require('../utils/writer.js');
const StoreOperations = require('../service/StoreOperationsService');

module.exports.getUserPreferences = function getUserPreferences(req, res, next, userId) {
  StoreOperations.getUserPreferences(req, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.submitUserData = function submitUserData(req, res, next, body) {
  StoreOperations.submitUserData(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};