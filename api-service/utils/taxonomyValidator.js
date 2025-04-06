/**
 * Utility for validating taxonomy-related data
 */
const {
  CATEGORY_ATTRIBUTES,
  CATEGORY_NAME_MAP,
  CATEGORY_ID_MAP,
  COMMON_CATEGORY_NAMES,
  CATEGORY_PATTERNS,
  getMainCategoryId,
} = require('./taxonomyConstants');

/**
 * Validate category ID or name against the taxonomy
 * @param {string} category - Category ID or name to validate
 * @returns {boolean} Whether the category is valid
 */
function validateCategoryId(category) {
  // Check if it's a valid numeric category ID
  if (/^\d+$/.test(category)) {
    const categoryNum = parseInt(category, 10);
    // Simply check if the ID exists in our name map
    return !!CATEGORY_NAME_MAP[categoryNum];
  }

  // String-based category validation
  // Convert to lowercase for case-insensitive matching
  const lowercaseCategory = category.toLowerCase();

  // Check if it's a known category name in our map
  if (CATEGORY_ID_MAP[lowercaseCategory]) {
    return true;
  }

  // Check against common names
  if (COMMON_CATEGORY_NAMES.includes(lowercaseCategory)) {
    return true;
  }

  // Check against regex patterns
  for (const { pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(lowercaseCategory)) {
      return true;
    }
  }

  return false;
}

/**
 * Determine the main category type for a given category ID or name
 * @param {string} category - Category ID or name
 * @returns {string} Lowercase main category name
 */
function getCategoryMainType(category) {
  // If it's a numeric category
  if (/^\d+$/.test(category)) {
    const categoryNum = parseInt(category, 10);
    const mainCategoryId = getMainCategoryId(categoryNum);
    return CATEGORY_NAME_MAP[mainCategoryId] || 'unknown';
  }

  // If it's a string-based category, first check direct mapping
  const lowercaseCategory = category.toLowerCase();
  if (CATEGORY_ID_MAP[lowercaseCategory]) {
    const categoryId = CATEGORY_ID_MAP[lowercaseCategory];
    const mainCategoryId = getMainCategoryId(categoryId);
    return CATEGORY_NAME_MAP[mainCategoryId] || 'unknown';
  }

  // Check against patterns
  for (const { pattern, type } of CATEGORY_PATTERNS) {
    if (pattern.test(lowercaseCategory)) {
      return type;
    }
  }

  // Default if no match found
  return 'unknown';
}

/**
 * Validate attributes based on category
 * @param {string} category - Category ID or name
 * @param {Object} attributes - Attributes to validate
 * @returns {Object} Validation result {valid: boolean, message: string}
 */
function validateAttributes(category, attributes) {
  // Get the main category for this item
  const mainCategoryName = getCategoryMainType(category);

  // Direct lookup instead of iteration
  const mainCategoryId = CATEGORY_ID_MAP[mainCategoryName];

  // If we couldn't determine the main category, we can't validate attributes
  if (!mainCategoryId) {
    return { valid: false, message: `Unknown category: ${category}` };
  }

  // Get valid attributes for this category
  const validAttributes = CATEGORY_ATTRIBUTES[mainCategoryId];
  if (!validAttributes) {
    return { valid: true }; // No specific validation rules for this category
  }

  // Check each attribute against the defined valid values
  for (const [attrName, attrValue] of Object.entries(attributes)) {
    // Skip if this attribute isn't defined for this category
    if (!validAttributes[attrName]) continue;

    // If the attribute is defined in our taxonomy, validate its value
    const validValues = validAttributes[attrName];

    // For attributes with predefined values (arrays)
    if (Array.isArray(validValues) && !validValues.includes(attrValue)) {
      return {
        valid: false,
        message: `Invalid ${attrName} for ${mainCategoryName}: ${attrValue}. Must be one of: ${validValues.join(', ')}`,
      };
    }
  }

  // All validations passed
  return { valid: true };
}

module.exports = {
  validateCategoryId,
  validateAttributes,
  getCategoryMainType,
};
