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

module.exports.lookupStores = function lookupStores(req, res, next, ids) {
  StoreProfile.lookupStores(req, ids)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.listStoresForUserDiscovery = function listStoresForUserDiscovery (req, res, next, search, limit, page) {
  StoreProfile.listStoresForUserDiscovery(req, search, limit, page) // Pass params to service
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};