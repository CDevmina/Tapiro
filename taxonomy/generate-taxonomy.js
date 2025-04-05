const fs = require("fs");
const path = require("path");

// Parse command line arguments
const forceGeneration = process.argv.includes("--force");

// Define paths
const taxonomyPath = path.join(__dirname, "taxonomy.json");
const jsOutputPath = path.join(
  __dirname,
  "..",
  "backend",
  "utils",
  "taxonomyConstants.js"
);
const pyOutputPath = path.join(
  __dirname,
  "..",
  "ai-service",
  "app",
  "taxonomy",
  "constants.py"
);

// Check if we need to generate files by comparing versions
function shouldGenerateFiles() {
  // Always generate if force flag is passed
  if (forceGeneration) {
    console.log("Forcing generation of taxonomy files");
    return true;
  }

  try {
    // Read taxonomy.json
    const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, "utf8"));
    const currentVersion = taxonomyData.version;

    console.log(`Current taxonomy version in JSON: ${currentVersion}`);

    // Check JS file version if it exists
    if (fs.existsSync(jsOutputPath)) {
      const jsContent = fs.readFileSync(jsOutputPath, "utf8");
      const jsVersionMatch = jsContent.match(/Version: ([0-9.]+)/);
      const jsVersion = jsVersionMatch ? jsVersionMatch[1] : null;

      console.log(`Existing JS file version: ${jsVersion || "unknown"}`);

      if (jsVersion === currentVersion) {
        // Check Python file version if it exists
        if (fs.existsSync(pyOutputPath)) {
          const pyContent = fs.readFileSync(pyOutputPath, "utf8");
          const pyVersionMatch = pyContent.match(/Version: ([0-9.]+)/);
          const pyVersion = pyVersionMatch ? pyVersionMatch[1] : null;

          console.log(
            `Existing Python file version: ${pyVersion || "unknown"}`
          );

          if (pyVersion === currentVersion) {
            console.log("No version change detected. Skipping generation.");
            return false;
          }
        }
      }
    }

    console.log("Version change detected. Generating new taxonomy files.");
    return true;
  } catch (error) {
    console.error("Error checking versions:", error.message);
    // On error, generate files to be safe
    return true;
  }
}

// Read the source taxonomy file
function generateTaxonomyFiles() {
  try {
    const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf8"));

    // Generate JavaScript file
    const jsOutput = generateJavaScript(taxonomy);
    fs.writeFileSync(jsOutputPath, jsOutput);
    console.log(`✅ Generated JavaScript file: ${jsOutputPath}`);

    // Generate Python file
    const pyOutput = generatePython(taxonomy);
    fs.writeFileSync(pyOutputPath, pyOutput);
    console.log(`✅ Generated Python file: ${pyOutputPath}`);

    console.log(
      `✅ Taxonomy generation complete (version ${taxonomy.version})`
    );
  } catch (error) {
    console.error("Error generating taxonomy files:", error.message);
    process.exit(1);
  }
}

// Generate JavaScript taxonomy constants
function generateJavaScript(taxonomy) {
  let output = `/**
 * Tapiro Product Taxonomy Constants
 * This file is AUTO-GENERATED from taxonomy.json - DO NOT MODIFY DIRECTLY
 * Generated on: ${new Date().toISOString()}
 * Version: ${taxonomy.version}
 */

// Main Categories
const MAIN_CATEGORIES = {
${Object.entries(taxonomy.mainCategories)
  .map(([key, value]) => `  ${key}: ${value},`)
  .join("\n")}
};

// Subcategories
const SUBCATEGORIES = {`;

  // Track main category for grouping
  let currentMainCat = null;

  Object.entries(taxonomy.subcategories).forEach(([key, value]) => {
    const mainCatId = Math.floor(value / 100) * 100;
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id === mainCatId
    );

    const mainCatName = mainCatEntry ? mainCatEntry[0] : null;

    if (mainCatName && mainCatName !== currentMainCat) {
      currentMainCat = mainCatName;
      output += `\n\n  // ${mainCatName}\n  ${key}: ${value},`;
    } else {
      output += `\n  ${key}: ${value},`;
    }
  });

  output += `\n};

// Attributes by category
const CATEGORY_ATTRIBUTES = {
${Object.entries(taxonomy.categoryAttributes)
  .map(([catId, attrs]) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id == catId
    );
    if (!mainCatEntry) return "";

    return `  [MAIN_CATEGORIES.${mainCatEntry[0]}]: {
${Object.entries(attrs)
  .map(([attrName, values]) => {
    if (Array.isArray(values)) {
      if (typeof values[0] === "string") {
        return `    ${attrName}: [${values.map((v) => `'${v}'`).join(", ")}],`;
      } else {
        return `    ${attrName}: [${values.join(", ")}],`;
      }
    } else {
      return `    ${attrName}: '${values}',`;
    }
  })
  .join("\n")}
  },`;
  })
  .join("\n")}
};

// Price range definitions by category
const PRICE_RANGES = {
${Object.entries(taxonomy.priceRanges)
  .map(([catId, ranges]) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id == catId
    );
    if (!mainCatEntry) return "";

    return `  [MAIN_CATEGORIES.${mainCatEntry[0]}]: {
${Object.entries(ranges)
  .map(
    ([rangeKey, { min, max }]) =>
      `    ${rangeKey}: { min: ${min}, max: ${
        max === null ? "Infinity" : max
      } },`
  )
  .join("\n")}
  },`;
  })
  .join("\n")}
};

// Common names for categories (for text-based detection)
const COMMON_CATEGORY_NAMES = [
${taxonomy.commonCategoryNames.map((name) => `  '${name}'`).join(",\n")}
];

// Category identification patterns
const CATEGORY_PATTERNS = [
${taxonomy.categoryPatterns
  .map(({ pattern, type, id }) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, catId]) => catId === id
    );

    return `  {
    pattern: /${pattern}/i,
    type: '${type}',
    id: ${mainCatEntry ? `MAIN_CATEGORIES.${mainCatEntry[0]}` : id},
  }`;
  })
  .join(",\n")}
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
  if (typeof categoryId === 'string' && /^\\d+$/.test(categoryId)) {
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
};`;

  return output;
}

// Generate Python taxonomy constants
function generatePython(taxonomy) {
  let output = `"""
Tapiro Product Taxonomy Constants
This file is AUTO-GENERATED from taxonomy.json - DO NOT MODIFY DIRECTLY
Generated on: ${new Date().toISOString()}
Version: ${taxonomy.version}
"""

# Main Categories
MAIN_CATEGORIES = {
${Object.entries(taxonomy.mainCategories)
  .map(([key, value]) => `    "${key}": ${value},`)
  .join("\n")}
}

# Subcategories
SUBCATEGORIES = {`;

  // Track main category for grouping
  let currentMainCat = null;

  Object.entries(taxonomy.subcategories).forEach(([key, value]) => {
    const mainCatId = Math.floor(value / 100) * 100;
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id === mainCatId
    );

    const mainCatName = mainCatEntry ? mainCatEntry[0] : null;

    if (mainCatName && mainCatName !== currentMainCat) {
      currentMainCat = mainCatName;
      output += `\n\n    # ${mainCatName}\n    "${key}": ${value},`;
    } else {
      output += `\n    "${key}": ${value},`;
    }
  });

  output += `\n}

# Attributes by category
CATEGORY_ATTRIBUTES = {
${Object.entries(taxonomy.categoryAttributes)
  .map(([catId, attrs]) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id == catId
    );
    if (!mainCatEntry) return "";

    return `    MAIN_CATEGORIES["${mainCatEntry[0]}"]: {
${Object.entries(attrs)
  .map(([attrName, values]) => {
    if (Array.isArray(values)) {
      if (typeof values[0] === "string") {
        return `        "${attrName}": [${values
          .map((v) => `"${v}"`)
          .join(", ")}],`;
      } else {
        return `        "${attrName}": [${values.join(", ")}],`;
      }
    } else {
      return `        "${attrName}": "${values}",`;
    }
  })
  .join("\n")}
    },`;
  })
  .join("\n")}
}

# Price range definitions by category
PRICE_RANGES = {
${Object.entries(taxonomy.priceRanges)
  .map(([catId, ranges]) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, id]) => id == catId
    );
    if (!mainCatEntry) return "";

    return `    MAIN_CATEGORIES["${mainCatEntry[0]}"]: {
${Object.entries(ranges)
  .map(
    ([rangeKey, { min, max }]) =>
      `        "${rangeKey}": {"min": ${min}, "max": ${
        max === null ? "float('inf')" : max
      }},`
  )
  .join("\n")}
    },`;
  })
  .join("\n")}
}

# Common names for categories (for text-based detection)
COMMON_CATEGORY_NAMES = [
${taxonomy.commonCategoryNames.map((name) => `    "${name}"`).join(",\n")}
]

# Category identification patterns
CATEGORY_PATTERNS = [
${taxonomy.categoryPatterns
  .map(({ pattern, type, id }) => {
    const mainCatEntry = Object.entries(taxonomy.mainCategories).find(
      ([_, catId]) => catId === id
    );

    return `    {
        "pattern": r"${pattern}",
        "type": "${type}",
        "id": MAIN_CATEGORIES["${
          mainCatEntry ? mainCatEntry[0] : "ELECTRONICS"
        }"],
    }`;
  })
  .join(",\n")}
]

# Pre-compute category name maps
CATEGORY_NAME_MAP = {}
CATEGORY_ID_MAP = {}

def format_category_name(name):
    """Format a category name from constant to user-friendly format"""
    return name.lower().replace("_", " ")

# Build maps
for name, id_value in MAIN_CATEGORIES.items():
    formatted_name = format_category_name(name)
    CATEGORY_NAME_MAP[id_value] = formatted_name
    CATEGORY_ID_MAP[formatted_name] = id_value

for name, id_value in SUBCATEGORIES.items():
    formatted_name = format_category_name(name)
    CATEGORY_NAME_MAP[id_value] = formatted_name
    CATEGORY_ID_MAP[formatted_name] = id_value`;

  return output;
}

// Main execution
if (shouldGenerateFiles()) {
  generateTaxonomyFiles();
} else {
  console.log("Taxonomy files are up-to-date. No generation needed.");
}
