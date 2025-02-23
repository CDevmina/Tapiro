const utils = require('../utils/writer.js');
const Advertisements = require('../service/AdvertisementService');

module.exports.createAd = function createAd(req, res, next, body) {
  const { storeId } = req.params;
  Advertisements.createAd(req, storeId, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.listAds = function listAds(req, res, next) {
  const { storeId } = req.params;
  Advertisements.listAds(req, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateAd = function updateAd(req, res, next, body) {
  const { storeId, adId } = req.params;
  Advertisements.updateAd(req, storeId, adId, body)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteAd = function deleteAd(req, res, next) {
  const { storeId, adId } = req.params;
  Advertisements.deleteAd(req, storeId, adId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
