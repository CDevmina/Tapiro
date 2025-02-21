const utils = require('../utils/writer.js');
const Authentication = require('../service/AuthenticationService');

module.exports.usersPOST = function usersPOST(req, res, next, body) {
  Authentication.usersPOST(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersProfileGET = function usersProfileGET(req, res, next) {
  Authentication.usersProfileGET(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersProfilePUT = function usersProfilePUT(req, res, next, body) {
  Authentication.usersProfilePUT(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersProfileDELETE = function usersProfileDELETE(req, res, next) {
  Authentication.usersProfileDELETE(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
