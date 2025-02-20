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

module.exports.usersUserIdGET = function usersUserIdGET(req, res, next, userId) {
  Authentication.usersUserIdGET(userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersUserIdPUT = function usersUserIdPUT(req, res, next, body, userId) {
  Authentication.usersUserIdPUT(body, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersUserIdDELETE = function usersUserIdDELETE(req, res, next, userId) {
  Authentication.usersUserIdDELETE(userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
