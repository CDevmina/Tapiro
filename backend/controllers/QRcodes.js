const utils = require('../utils/writer.js');
const QRcodes = require('../service/QRcodesService');

module.exports.generateQR = function generateQR(req, res, next, storeId) {
  QRcodes.generateQR(storeId)
    .then((response) => {
      res.set('Content-Type', 'image/png');
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.processScan = function processScan(req, res, next, body) {
  QRcodes.processScan(body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
