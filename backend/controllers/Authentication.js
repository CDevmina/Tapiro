'use strict';

var utils = require('../utils/writer.js');
var Authentication = require('../service/AuthenticationService');

module.exports.authAuthorizeGET = function authAuthorizeGET(req, res, next, response_type, client_id, redirect_uri) {
  Authentication.authAuthorizeGET(response_type, client_id, redirect_uri)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.authTokenPOST = function authTokenPOST(req, res, next) {
  Authentication.authTokenPOST()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.usersPOST = function usersPOST(req, res, next, body) {
  Authentication.usersPOST(body)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (error) {
      utils.writeJson(res, {
        error: error.message || 'Internal server error',
        status: error.status || 500
      }, error.status || 500);
    });
};

module.exports.usersUserIdGET = function usersUserIdGET(req, res, next, userId) {
  Authentication.usersUserIdGET(userId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (error) {
      utils.writeJson(res, {
        error: error.message || 'Internal server error',
        status: error.status || 500
      }, error.status || 500);
    });
};

module.exports.usersUserIdPUT = function usersUserIdPUT(req, res, next, body, userId) {
  Authentication.usersUserIdPUT(body, userId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (error) {
      utils.writeJson(res, {
        error: error.message || 'Internal server error',
        status: error.status || 500
      }, error.status || 500);
    });
};

module.exports.usersUserIdDELETE = function usersUserIdDELETE(req, res, next, userId) {
  Authentication.usersUserIdDELETE(userId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (error) {
      utils.writeJson(res, {
        error: error.message || 'Internal server error',
        status: error.status || 500
      }, error.status || 500);
    });
};