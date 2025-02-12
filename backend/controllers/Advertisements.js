const utils = require('../utils/writer.js');
const Advertisements = require('../service/AdvertisementsService');

module.exports.createAd = function createAd(req, res, next, body, storeId) {
  Advertisements.createAd(body, storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.listAds = function listAds(req, res, next, storeId) {
  Advertisements.listAds(storeId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.updateAd = function updateAd(req, res, next, body, storeId, adId) {
  Advertisements.updateAd(body, storeId, adId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};

module.exports.deleteAd = function deleteAd(req, res, next, storeId, adId) {
  Advertisements.deleteAd(storeId, adId)
    .then((response) => {
      utils.writeJson(res, response);
    })
    .catch((response) => {
      utils.writeJson(res, response);
    });
};
