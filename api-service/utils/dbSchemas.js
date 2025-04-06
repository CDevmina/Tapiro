/**
 * MongoDB schema definitions for data validation
 */

// Import taxonomy constants
const { CATEGORY_ATTRIBUTES } = require('./taxonomyConstants');

// Schema version tracking
const SCHEMA_VERSION = '1.0.6';

/**
 * Generate schema properties for user preferences attributes (distribution format)
 * @returns {Object} MongoDB schema properties for preference attributes
 */
function generatePreferenceAttributeProperties() {
  const properties = {};

  // Extract all unique attribute names from all categories
  const allAttributeNames = new Set();

  Object.values(CATEGORY_ATTRIBUTES).forEach((categoryAttrs) => {
    Object.keys(categoryAttrs).forEach((attrName) => {
      allAttributeNames.add(attrName);
    });
  });

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
      // Each attribute can have any string key with double values
      properties[attrName] = { bsonType: 'object' };
    }
  });

  return properties;
}

/**
 * Generate schema properties for user data attributes (enum format)
 * @returns {Object} MongoDB schema properties for data attributes
 */
function generateDataAttributeProperties() {
  const properties = {};

  // Collect all unique attribute names and their possible values
  Object.values(CATEGORY_ATTRIBUTES).forEach((categoryAttrs) => {
    Object.entries(categoryAttrs).forEach(([attrName, attrValues]) => {
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
  });

  return properties;
}

// User schema
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
                properties: generatePreferenceAttributeProperties(),
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

// User Data schema
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
                      properties: generateDataAttributeProperties(),
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

module.exports = {
  userSchema,
  storeSchema,
  apiUsageSchema,
  userDataSchema,
  SCHEMA_VERSION,
};
