const utils = require('../utils/writer.js');
const Authentication = require('../service/AuthenticationService');

module.exports.authAuthorizeGET = function authAuthorizeGET(
  req,
  res,
  next,
  responseType,
  clientId,
  redirectUri,
) {
  Authentication.authAuthorizeGET(responseType, clientId, redirectUri)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.authTokenPOST = function authTokenPOST(req, res) {
  Authentication.authTokenPOST()
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.usersPOST = function usersPOST(req, res, next, body) {
  const user = req.user;
  Authentication.usersPOST(body, user)
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
