const utils = require('../utils/writer.js');
const StoreManagement = require('../service/StoreManagementService');

module.exports.createApiKey = function createApiKey(req, res, next) {
  StoreManagement.createApiKey(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.listApiKeys = function listApiKeys(req, res, next) {
  StoreManagement.listApiKeys(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.revokeApiKey = function revokeApiKey(req, res, next, keyId) {
  StoreManagement.revokeApiKey(req, keyId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
