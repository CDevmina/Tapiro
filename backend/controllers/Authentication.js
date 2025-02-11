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
  Authentication.usersPOST(body)
    .then((response) => {
      utils.writeJson(res, response, 201);
    })
    .catch((error) => {
      utils.writeJson(
        res,
        {
          error: error.message || 'Internal server error',
          status: error.status || 500,
        },
        error.status || 500,
      );
    });
};

module.exports.usersUserIdGET = function usersUserIdGET(req, res, next, userId) {
  Authentication.usersUserIdGET(userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((error) => {
      utils.writeJson(
        res,
        {
          error: error.message || 'Internal server error',
          status: error.status || 500,
        },
        error.status || 500,
      );
    });
};

module.exports.usersUserIdPUT = function usersUserIdPUT(req, res, next, body, userId) {
  Authentication.usersUserIdPUT(body, userId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((error) => {
      utils.writeJson(
        res,
        {
          error: error.message || 'Internal server error',
          status: error.status || 500,
        },
        error.status || 500,
      );
    });
};

module.exports.usersUserIdDELETE = function usersUserIdDELETE(req, res, next, userId) {
  Authentication.usersUserIdDELETE(userId)
    .then((response) => {
      utils.writeJson(res, response, 204);
    })
    .catch((error) => {
      utils.writeJson(
        res,
        {
          error: error.message || 'Internal server error',
          status: error.status || 500,
        },
        error.status || 500,
      );
    });
};
