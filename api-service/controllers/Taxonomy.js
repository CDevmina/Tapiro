const utils = require('../utils/writer.js');
const TaxonomyService = require('../service/TaxonomyService');

module.exports.getTaxonomyCategories = function getTaxonomyCategories (req, res, next) {
  TaxonomyService.getTaxonomyCategories()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};