const utils = require('../utils/writer.js');
const QRcodes = require('../service/QRCodeService');

module.exports.generateQR = function generateQR(req, res, next) {
  const { storeId } = req.params;
  QRcodes.generateQR(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.processScan = function processScan(req, res, next, body) {
  QRcodes.processScan(req, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
