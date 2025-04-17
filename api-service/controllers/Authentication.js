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

module.exports.registerStore = function registerStore(req, res, next, body) {
  Authentication.registerStore(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateUserMetadata = function updateUserMetadata(req, res, next, body) {
  Authentication.updateUserMetadata(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getUserMetadata = function getUserMetadata(req, res, next) {
  Authentication.getUserMetadata(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.getCurrentUserRoles = function getCurrentUserRoles (req, res, next) {
  Authentication.getCurrentUserRoles(req)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};