const utils = require('../utils/writer.js');
const Authentication = require('../service/AuthenticationService');

module.exports.registerUser = function registerUser(req, res, next, body) {
  Authentication.registerUser(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getUserProfile = function getUserProfile(req, res, next) {
  Authentication.getUserProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateUserProfile = function updateUserProfile(req, res, next, body) {
  Authentication.updateUserProfile(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteUserProfile = function deleteUserProfile(req, res, next) {
  Authentication.deleteUserProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.registerStore = function registerStore(req, res, next, body) {
  Authentication.registerStore(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getStoreProfile = function getStoreProfile(req, res, next) {
  Authentication.getStoreProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateStoreProfile = function updateStoreProfile(req, res, next, body) {
  Authentication.updateStoreProfile(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteStoreProfile = function deleteStoreProfile(req, res, next) {
  Authentication.deleteStoreProfile(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
