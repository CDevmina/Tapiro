/**
 * MongoDB schema definitions for data validation
 */

// Replace direct import with taxonomy service
const taxonomyService = require('../clients/taxonomyService');
const { getCache, setCache } = require('../utils/redisUtil');
const { CACHE_TTL, CACHE_KEYS } = require('../utils/cacheConfig');

// Schema version tracking
const SCHEMA_VERSION = '1.0.7';

/**
 * Generate schema properties for user preferences attributes (distribution format)
 * @returns {Promise<Object>} MongoDB schema properties for preference attributes
 */
async function generatePreferenceAttributeProperties() {
  // Check Redis cache first
  const cacheKey = `${CACHE_KEYS.SCHEMA_PROPS}preference`;
  const cachedProps = await getCache(cacheKey);
  if (cachedProps) {
    return JSON.parse(cachedProps);
  }

  const properties = {};
  const allAttributeNames = new Set();

  try {
    // Get taxonomy tree
    const taxonomyTree = await taxonomyService.getTaxonomyTree();

    // Extract category IDs from tree
    const categoryIds = [];
    const processNode = (node, path = []) => {
      if (node.id) categoryIds.push(node.id);

      for (const [key, value] of Object.entries(node)) {
        if (key !== 'id' && typeof value === 'object') {
          processNode(value, [...path, key]);
        }
      }
    };

    processNode(taxonomyTree.tree);

    // Get attributes for each category
    for (const categoryId of categoryIds) {
      const attributes = await taxonomyService.getCategoryAttributes(categoryId);
      if (!attributes) continue;

      Object.keys(attributes).forEach((attrName) => {
        allAttributeNames.add(attrName);
      });
    }

    // Create schema definition for each attribute
    allAttributeNames.forEach((attrName) => {
      // For price_range, we know the exact values
      if (attrName === 'price_range') {
        properties[attrName] = {
          bsonType: 'object',
          properties: {
            budget: { bsonType: 'double' },
            mid_range: { bsonType: 'double' },
            premium: { bsonType: 'double' },
            luxury: { bsonType: 'double' },
          },
        };
      } else {
        // For other attributes, we define them as generic objects
        properties[attrName] = { bsonType: 'object' };
      }
    });

    // Cache in Redis instead of local cache
    await setCache(cacheKey, JSON.stringify(properties), { EX: CACHE_TTL.SCHEMA || 3600 });

    return properties;
  } catch (error) {
    console.error('Error generating preference attribute properties:', error);
    // Fallback to empty properties
    return {};
  }
}

/**
 * Generate schema properties for user data attributes (enum format)
 * @returns {Promise<Object>} MongoDB schema properties for data attributes
 */
async function generateDataAttributeProperties() {
  // Check Redis cache first
  const cacheKey = `${CACHE_KEYS.SCHEMA_PROPS}data`;
  const cachedProps = await getCache(cacheKey);
  if (cachedProps) {
    return JSON.parse(cachedProps);
  }

  const properties = {};

  try {
    // Get taxonomy tree
    const taxonomyTree = await taxonomyService.getTaxonomyTree();

    // Extract category IDs from tree
    const categoryIds = [];
    const processNode = (node, path = []) => {
      if (node.id) categoryIds.push(node.id);

      for (const [key, value] of Object.entries(node)) {
        if (key !== 'id' && typeof value === 'object') {
          processNode(value, [...path, key]);
        }
      }
    };

    processNode(taxonomyTree.tree);

    // Get attributes for each category
    for (const categoryId of categoryIds) {
      const attributes = await taxonomyService.getCategoryAttributes(categoryId);
      if (!attributes) continue;

      Object.entries(attributes).forEach(([attrName, attrValues]) => {
        // If we already defined this attribute, skip
        if (properties[attrName]) return;

        // If attribute has predefined values (array), create an enum
        if (Array.isArray(attrValues)) {
          properties[attrName] = {
            bsonType: 'string',
            enum: attrValues,
          };
        } else if (attrName === 'rating') {
          // Special case for numeric ratings
          properties[attrName] = {
            bsonType: 'int',
            minimum: Math.min(...attrValues),
            maximum: Math.max(...attrValues),
          };
        } else if (attrValues === 'numeric') {
          // For numeric fields like release_year
          properties[attrName] = { bsonType: 'int' };
        } else {
          // Default to string for other attributes
          properties[attrName] = { bsonType: 'string' };
        }
      });
    }

    // Cache in Redis instead of local cache
    await setCache(cacheKey, JSON.stringify(properties), { EX: CACHE_TTL.SCHEMA || 3600 });

    return properties;
  } catch (error) {
    console.error('Error generating data attribute properties:', error);
    // Fallback to empty properties
    return {};
  }
}

// Initialize schema with basic structure, we'll fill in the properties during runtime
const userSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['auth0Id', 'email', 'username', 'privacySettings', 'createdAt'],
      properties: {
        schemaVersion: {
          bsonType: 'string',
          description: 'Schema version for tracking changes',
        },
        auth0Id: {
          bsonType: 'string',
          description: 'Auth0 user ID',
        },
        email: {
          bsonType: 'string',
          description: 'User email address',
        },
        username: {
          bsonType: 'string',
          description: 'Username',
        },
        phone: {
          bsonType: ['string', 'null'],
          description: 'Phone number',
        },
        preferences: {
          bsonType: 'array',
          description: 'User interests and preferences',
          items: {
            bsonType: 'object',
            required: ['category', 'score'],
            properties: {
              category: { bsonType: 'string' },
              score: {
                bsonType: 'double',
                minimum: 0.0,
                maximum: 1.0,
              },
              attributes: {
                bsonType: 'object',
                // We'll fill in properties dynamically when needed
              },
            },
          },
        },
        privacySettings: {
          bsonType: 'object',
          required: ['dataSharingConsent'],
          properties: {
            dataSharingConsent: { bsonType: 'bool' },
            anonymizeData: { bsonType: 'bool' },
            optInStores: { bsonType: 'array' },
            optOutStores: { bsonType: 'array' },
          },
        },
        dataAccess: {
          bsonType: 'object',
          properties: {
            allowedDomains: { bsonType: 'array' },
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'moderate',
  validationAction: 'error',
};

// Store schema
const storeSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['auth0Id', 'name', 'address', 'createdAt'],
      properties: {
        auth0Id: {
          bsonType: 'string',
          description: 'Auth0 store ID',
        },
        name: {
          bsonType: 'string',
          description: 'Store name',
        },
        email: {
          bsonType: 'string',
          description: 'Store email address',
        },
        address: {
          bsonType: 'string',
          description: 'Physical address',
        },
        webhooks: {
          bsonType: 'array',
          description: 'Webhook configurations',
          items: {
            bsonType: 'object',
            required: ['url', 'events'],
            properties: {
              url: { bsonType: 'string' },
              events: { bsonType: 'array' },
            },
          },
        },
        apiKeys: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['keyId', 'prefix', 'hashedKey', 'status', 'createdAt'],
            properties: {
              keyId: { bsonType: 'string' },
              prefix: { bsonType: 'string' },
              hashedKey: { bsonType: 'string' },
              name: { bsonType: 'string' },
              status: { bsonType: 'string' },
              createdAt: { bsonType: 'date' },
            },
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'moderate',
  validationAction: 'error',
};

// API Usage schema
const apiUsageSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['storeId', 'apiKeyId', 'apiKeyPrefix', 'endpoint', 'method', 'timestamp'],
      properties: {
        storeId: { bsonType: 'string' },
        apiKeyId: { bsonType: 'string' },
        apiKeyPrefix: { bsonType: 'string' },
        endpoint: { bsonType: 'string' },
        method: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        userAgent: { bsonType: 'string' },
      },
    },
  },
  validationLevel: 'moderate',
  validationAction: 'error',
};

// User Data schema - simplified version without dynamic properties
const userDataSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'storeId', 'email', 'dataType', 'entries', 'timestamp'],
      properties: {
        userId: { bsonType: 'objectId' },
        storeId: { bsonType: 'string' },
        email: { bsonType: 'string' },
        dataType: {
          bsonType: 'string',
          enum: ['purchase', 'search'],
          description: 'Type of data being stored',
        },
        entries: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['timestamp'],
            properties: {
              timestamp: { bsonType: 'date' },
              items: {
                bsonType: 'array',
                description: 'For purchase data',
                items: {
                  bsonType: 'object',
                  required: ['name', 'category'],
                  properties: {
                    name: { bsonType: 'string' },
                    category: { bsonType: 'string' },
                    price: { bsonType: 'double' },
                    quantity: { bsonType: 'int' },
                    attributes: {
                      bsonType: 'object',
                      description: 'Category-specific attributes',
                      // We'll fill in properties dynamically when needed
                    },
                  },
                },
              },
              query: {
                bsonType: 'string',
                description: 'For search data',
              },
              category: { bsonType: 'string' },
              results: { bsonType: 'int' },
              clicked: {
                bsonType: 'array',
                items: { bsonType: 'string' },
              },
            },
          },
        },
        metadata: {
          bsonType: 'object',
          description: 'Additional metadata about the collection event',
          properties: {
            source: { bsonType: 'string' },
            deviceType: { bsonType: 'string' },
            sessionId: { bsonType: 'string' },
          },
        },
        processedStatus: {
          bsonType: 'string',
          enum: ['pending', 'processed', 'failed'],
          description: 'Status of algorithm processing',
        },
        timestamp: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'moderate',
  validationAction: 'error',
};

// Helper function to dynamically apply attribute properties to schemas
async function initializeSchemas() {
  try {
    const preferenceProps = await generatePreferenceAttributeProperties();
    const dataProps = await generateDataAttributeProperties();

    // Update user preference schema
    if (userSchema.validator.$jsonSchema.properties.preferences.items.properties.attributes) {
      userSchema.validator.$jsonSchema.properties.preferences.items.properties.attributes.properties =
        preferenceProps;
    }

    // Update user data schema
    if (
      userDataSchema.validator.$jsonSchema.properties.entries.items.properties.items.items
        .properties.attributes
    ) {
      userDataSchema.validator.$jsonSchema.properties.entries.items.properties.items.items.properties.attributes.properties =
        dataProps;
    }

    console.log('Schemas initialized with taxonomy data');
  } catch (error) {
    console.error('Failed to initialize schemas with taxonomy data:', error);
  }
}

// Call this when your server starts
initializeSchemas().catch(console.error);

module.exports = {
  userSchema,
  storeSchema,
  apiUsageSchema,
  userDataSchema,
  SCHEMA_VERSION,
  initializeSchemas, // Export to allow explicit initialization
};
