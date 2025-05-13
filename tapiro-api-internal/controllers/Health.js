const utils = require('../utils/writer.js');
const Health = require('../service/HealthService');

module.exports.healthCheck = function healthCheck(req, res, next) {
  Health.healthCheck(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.ping = function ping(req, res, next) {
  Health.ping(req)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
