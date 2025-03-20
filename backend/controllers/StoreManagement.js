const utils = require('../utils/writer.js');
const StoreManagement = require('../service/StoreManagementService');

module.exports.createApiKey = function createApiKey(req, res, next, body) {
  StoreManagement.createApiKey(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getApiKeys = function getApiKeys(req, res, next) {
  StoreManagement.getApiKeys(req)
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

module.exports.getApiKeyUsage = function getApiKeyUsage(req, res, next, keyId) {
  StoreManagement.getApiKeyUsage(req, keyId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
}