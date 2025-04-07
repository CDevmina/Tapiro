const taxonomyService = require('../clients/taxonomyService');
const { respondWithCode } = require('./writer');

/**
 * Validate category and attributes
 * @param {string} categoryId - Category ID
 * @param {Object} attributes - Attributes to validate
 * @returns {Promise<{valid: boolean, response: Object|null}>} Validation result
 */
exports.validateCategoryAndAttributes = async function (categoryId, attributes) {
  // Validate category exists
  const isValidCategory = await taxonomyService
    .getCategoryAttributes(categoryId)
    .then((attrs) => !!attrs)
    .catch(() => false);

  if (!isValidCategory) {
    return {
      valid: false,
      response: respondWithCode(400, {
        code: 400,
        message: `Invalid category: ${categoryId}`,
      }),
    };
  }

  // Validate attributes if provided
  if (attributes) {
    const validationResult = await taxonomyService.validateAttributes(categoryId, attributes);
    if (!validationResult.valid) {
      return {
        valid: false,
        response: respondWithCode(400, {
          code: 400,
          message: validationResult.message || `Invalid attributes for category ${categoryId}`,
        }),
      };
    }
  }

  return { valid: true, response: null };
};
