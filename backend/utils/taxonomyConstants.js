/**
 * Tapiro Product Taxonomy Constants
 * This file defines the standardized product taxonomy used throughout the platform
 */

// Main Categories
const MAIN_CATEGORIES = {
  ELECTRONICS: 100,
  CLOTHING: 200,
  HOME_GARDEN: 300,
  BEAUTY_PERSONAL_CARE: 400,
  SPORTS_OUTDOORS: 500,
  BOOKS_MEDIA: 600,
  FOOD_GROCERY: 700,
  AUTOMOTIVE: 800,
  HEALTH_WELLNESS: 900,
  TOYS_GAMES: 1000,
};

// Subcategories
const SUBCATEGORIES = {
  // Electronics
  SMARTPHONES: 101,
  COMPUTERS: 102,
  AUDIO: 103,
  TVS_DISPLAYS: 104,
  CAMERAS: 105,
  WEARABLES: 106,
  GAMING: 107,
  SMART_HOME: 108,
  TABLETS: 109,
  ELECTRONICS_ACCESSORIES: 110,

  // Clothing
  MENS_CLOTHING: 201,
  WOMENS_CLOTHING: 202,
  CHILDRENS_CLOTHING: 203,
  FOOTWEAR: 204,
  CLOTHING_ACCESSORIES: 205,
  ACTIVEWEAR: 206,
  FORMAL_WEAR: 207,
  UNDERWEAR: 208,
  SEASONAL: 209,
  SUSTAINABLE_FASHION: 210,

  // Home & Garden
  FURNITURE: 301,
  KITCHEN: 302,
  HOME_DECOR: 303,
  BEDDING_BATH: 304,
  STORAGE: 305,
  GARDEN: 306,
  LIGHTING: 307,
  APPLIANCES: 308,
  HOME_IMPROVEMENT: 309,
  HOME_OFFICE: 310,

  // Add more subcategories for other main categories as needed
};

// Attributes by category
const CATEGORY_ATTRIBUTES = {
  // Electronics attributes
  [MAIN_CATEGORIES.ELECTRONICS]: {
    price_range: ['budget', 'mid_range', 'premium', 'luxury'],
    brand: ['apple', 'samsung', 'sony', 'google', 'lg', 'other'],
    color: ['black', 'white', 'silver', 'gold', 'blue', 'red', 'other'],
    feature: ['wireless', 'smart', 'portable', 'gaming', 'waterproof'],
    rating: [1, 2, 3, 4, 5],
    release_year: 'numeric',
  },

  // Clothing attributes
  [MAIN_CATEGORIES.CLOTHING]: {
    price_range: ['budget', 'mid_range', 'premium', 'luxury'],
    color: ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'other'],
    material: ['cotton', 'wool', 'polyester', 'leather', 'denim', 'other'],
    size: ['xs', 's', 'm', 'l', 'xl', 'xxl'],
    style: ['casual', 'formal', 'sport', 'vintage', 'business'],
    season: ['summer', 'winter', 'spring', 'fall', 'all_season'],
    gender: ['men', 'women', 'unisex', 'children'],
  },

  // Home & Garden attributes
  [MAIN_CATEGORIES.HOME_GARDEN]: {
    price_range: ['budget', 'mid_range', 'premium', 'luxury'],
    color: ['black', 'white', 'wood', 'metal', 'beige', 'grey', 'other'],
    material: ['wood', 'metal', 'plastic', 'glass', 'fabric', 'other'],
    style: ['modern', 'traditional', 'minimalist', 'industrial', 'rustic'],
    room: ['living', 'bedroom', 'kitchen', 'bathroom', 'office', 'outdoor'],
    size: ['small', 'medium', 'large'],
  },

  // Add more category attributes as needed
};

// Price range definitions by category
const PRICE_RANGES = {
  [MAIN_CATEGORIES.ELECTRONICS]: {
    budget: { min: 0, max: 100 },
    mid_range: { min: 100, max: 500 },
    premium: { min: 500, max: 1000 },
    luxury: { min: 1000, max: Infinity },
  },
  [MAIN_CATEGORIES.CLOTHING]: {
    budget: { min: 0, max: 30 },
    mid_range: { min: 30, max: 100 },
    premium: { min: 100, max: 300 },
    luxury: { min: 300, max: Infinity },
  },
  [MAIN_CATEGORIES.HOME_GARDEN]: {
    budget: { min: 0, max: 50 },
    mid_range: { min: 50, max: 200 },
    premium: { min: 200, max: 500 },
    luxury: { min: 500, max: Infinity },
  },
  [MAIN_CATEGORIES.BEAUTY_PERSONAL_CARE]: {
    budget: { min: 0, max: 15 },
    mid_range: { min: 15, max: 50 },
    premium: { min: 50, max: 100 },
    luxury: { min: 100, max: Infinity },
  },
  [MAIN_CATEGORIES.SPORTS_OUTDOORS]: {
    budget: { min: 0, max: 25 },
    mid_range: { min: 25, max: 100 },
    premium: { min: 100, max: 300 },
    luxury: { min: 300, max: Infinity },
  },
  // Add more as needed
};

// Common names for categories (for text-based detection)
const COMMON_CATEGORY_NAMES = [
  'smartphones',
  'computers',
  'audio',
  'tvs',
  'cameras',
  'wearables',
  'gaming',
  'smart home',
  'tablets',
  'accessories',
  'clothing',
  'fashion',
  'shirts',
  'pants',
  'dresses',
  'furniture',
  'kitchen',
  'decor',
  'lighting',
  'garden',
  // Additional common terms can be added here
];

// Category identification patterns
const CATEGORY_PATTERNS = [
  {
    pattern: /electronics|smartphone|computer|audio|tv|camera|wearable|gaming|tablet/i,
    type: 'electronics',
    id: MAIN_CATEGORIES.ELECTRONICS,
  },
  {
    pattern: /clothing|fashion|apparel|wear|shoe|dress|pant|shirt/i,
    type: 'clothing',
    id: MAIN_CATEGORIES.CLOTHING,
  },
  {
    pattern: /home|furniture|kitchen|decor|garden|lighting|appliance/i,
    type: 'home_garden',
    id: MAIN_CATEGORIES.HOME_GARDEN,
  },
  {
    pattern: /beauty|cosmetic|makeup|skincare|personal care/i,
    type: 'beauty_personal_care',
    id: MAIN_CATEGORIES.BEAUTY_PERSONAL_CARE,
  },
  {
    pattern: /sports|outdoors|fitness|exercise|recreation/i,
    type: 'sports_outdoors',
    id: MAIN_CATEGORIES.SPORTS_OUTDOORS,
  },
  {
    pattern: /books|media|reading|e-?book|audio ?book/i,
    type: 'books_media',
    id: MAIN_CATEGORIES.BOOKS_MEDIA,
  },
  {
    pattern: /food|grocery|beverage|drink|snack/i,
    type: 'food_grocery',
    id: MAIN_CATEGORIES.FOOD_GROCERY,
  },
  {
    pattern: /automotive|car|vehicle|auto/i,
    type: 'automotive',
    id: MAIN_CATEGORIES.AUTOMOTIVE,
  },
  {
    pattern: /health|wellness|medical|supplement/i,
    type: 'health_wellness',
    id: MAIN_CATEGORIES.HEALTH_WELLNESS,
  },
  {
    pattern: /toys|games|entertainment|plaything/i,
    type: 'toys_games',
    id: MAIN_CATEGORIES.TOYS_GAMES,
  },
];

// Pre-computed category name maps (built once at load time)
const CATEGORY_NAME_MAP = {};
const CATEGORY_ID_MAP = {};

/**
 * Format a category name from constant to user-friendly format
 * @param {string} name - Category name in constant format
 * @returns {string} Formatted name
 */
function formatCategoryName(name) {
  return name.toLowerCase().replace(/_/g, ' ');
}

// Build maps once at load time
for (const [name, id] of Object.entries(MAIN_CATEGORIES)) {
  const formattedName = formatCategoryName(name);
  CATEGORY_NAME_MAP[id] = formattedName;
  CATEGORY_ID_MAP[formattedName] = id;
}

for (const [name, id] of Object.entries(SUBCATEGORIES)) {
  const formattedName = formatCategoryName(name);
  CATEGORY_NAME_MAP[id] = formattedName;
  CATEGORY_ID_MAP[formattedName] = id;
}

/**
 * Get the main category ID from any category ID
 * @param {string|number} categoryId - Category ID
 * @returns {number|null} Main category ID or null if invalid
 */
function getMainCategoryId(categoryId) {
  if (typeof categoryId === 'string' && /^\d+$/.test(categoryId)) {
    // If it's a string with numbers, convert to integer
    const categoryNum = parseInt(categoryId, 10);
    return Math.floor(categoryNum / 100) * 100;
  } else if (typeof categoryId === 'number') {
    // If it's already a number
    return Math.floor(categoryId / 100) * 100;
  }
  return null;
}

/**
 * Get main category name from ID (simplified with maps)
 * @param {string|number} categoryId
 * @returns {string} Category name
 */
function getMainCategoryName(categoryId) {
  const mainCategoryId = getMainCategoryId(categoryId);
  return mainCategoryId ? CATEGORY_NAME_MAP[mainCategoryId] || 'unknown' : 'unknown';
}

/**
 * Get price range from amount and category
 * @param {number} amount - Price amount
 * @param {string|number} categoryId - Category ID
 * @returns {string} Price range label
 */
function getPriceRange(amount, categoryId) {
  const mainCategoryId = getMainCategoryId(categoryId) || MAIN_CATEGORIES.ELECTRONICS;

  // Get price ranges for the category
  const ranges = PRICE_RANGES[mainCategoryId] || PRICE_RANGES[MAIN_CATEGORIES.ELECTRONICS];

  // Find matching range
  for (const [range, { min, max }] of Object.entries(ranges)) {
    if (amount >= min && amount < max) {
      return range;
    }
  }

  return 'unknown';
}

module.exports = {
  MAIN_CATEGORIES,
  SUBCATEGORIES,
  CATEGORY_ATTRIBUTES,
  PRICE_RANGES,
  COMMON_CATEGORY_NAMES,
  CATEGORY_PATTERNS,
  CATEGORY_NAME_MAP,
  CATEGORY_ID_MAP,
  formatCategoryName,
  getMainCategoryId,
  getMainCategoryName,
  getPriceRange,
};
