'use strict';

const utils = require('../utils/writer.js');
const System = require('../service/SystemService');

module.exports.healthCheck = function healthCheck(req, res, next) {
    System.getHealth()
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response);
        });
};