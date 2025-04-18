const utils = require('../utils/writer.js');
const Authentication = require('../service/AuthenticationService');
const { handleServiceError } = require("../utils/errorUtil");

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

module.exports = {
  registerUser,
  registerStore,
};