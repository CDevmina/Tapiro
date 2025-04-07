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

/**
 * Validate multiple items at once
 * @param {Array<Object>} items - Items with category and attributes
 * @returns {Promise<Object>} Validation results with index keys
 */
exports.validateBatch = async function (items) {
  try {
    const productsToValidate = items.map((item) => ({
      category: item.category,
      attributes: item.attributes || {},
    }));

    return await taxonomyService.validateBatch(productsToValidate);
  } catch (error) {
    console.error('Batch validation failed:', error);
    return {};
  }
};

/**
 * Get price range for an amount
 * @param {number} amount - Price amount
 * @param {string} categoryId - Optional category ID
 * @returns {Promise<string>} Price range label
 */
exports.getPriceRange = async function (amount, categoryId = null) {
  try {
    const result = await taxonomyService.getPriceRangeForAmount(amount, categoryId);
    return result.range || 'unknown';
  } catch (error) {
    console.error(`Failed to get price range for ${amount}:`, error);
    return 'unknown';
  }
};
