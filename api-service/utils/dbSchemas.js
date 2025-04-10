/**
 * MongoDB schema definitions for data validation
 */

// Schema version tracking
const SCHEMA_VERSION = '2.0.1';

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

// User Data schema with flexible attributes structure
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
