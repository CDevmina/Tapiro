const utils = require('../utils/writer.js');
const StoreProfile = require('../service/StoreProfileService');

module.exports.getStoreProfile = function getStoreProfile(req, res, next) {
  StoreProfile.getStoreProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateStoreProfile = function updateStoreProfile(req, res, next, body) {
  StoreProfile.updateStoreProfile(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteStoreProfile = function deleteStoreProfile(req, res, next) {
  StoreProfile.deleteStoreProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.searchStores = function searchStores(req, res, next) {
  const { query, limit } = req.query;
  StoreProfile.searchStores(req, query, limit)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.lookupStores = function lookupStores(req, res, next) {
  const body = req.body; // Get body from request
  StoreProfile.lookupStores(req, body) // Pass body to service
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getStoreUsers = function getStoreUsers(req, res, next) {
  StoreProfile.getStoreUsers(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};