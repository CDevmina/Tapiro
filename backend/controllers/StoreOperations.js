const utils = require('../utils/writer.js');
const StoreOperations = require('../service/StoreOperationsService');

/**
 * Get user preferences for targeted advertising
 * Used by stores to retrieve user preferences via API key
 */
module.exports.getUserPreferences = function getUserPreferences(req, res, next, userId) {
  StoreOperations.getUserPreferences(req, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

/**
 * Submit user data for analysis
 * Used by stores to submit user data via API key
 */
module.exports.submitUserData = function submitUserData(req, res, next, body) {
  StoreOperations.submitUserData(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};