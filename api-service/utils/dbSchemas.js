/**
 * MongoDB schema definitions for data validation
 */

// Schema version tracking
const SCHEMA_VERSION = '3.0.0'; // Incremented version

const userSchema = {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['auth0Id', 'email', 'username', 'privacySettings', 'createdAt'],
      properties: {
        schemaVersion: {
          bsonType: 'string',
          description: 'Schema version for tracking changes',
          // Consider adding enum: [SCHEMA_VERSION] if strict enforcement is needed
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
        // --- Start: Demographic Data Object ---
        demographicData: {
          bsonType: 'object',
          description: 'User-provided and inferred demographic information',
          properties: {
            // --- User-Provided ---
            gender: {
              bsonType: ['string', 'null'],
              description: 'User-provided gender identity', // Clarified description
              enum: ['male', 'female', 'non-binary', 'prefer_not_to_say', null]
            },
            incomeBracket: {
              bsonType: ['string', 'null'],
              description: 'User-provided income bracket category', // Clarified description
              enum: ['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say', null]
            },
            country: {
              bsonType: ['string', 'null'],
              description: 'User-provided country of residence (e.g., ISO 3166-1 alpha-2 code)', // Clarified description
            },
            age: {
              bsonType: ['int', 'null'],
              description: 'User-provided age', // Clarified description
              minimum: 0,
            },
            // --- Inferred fields ---
            inferredHasKids: {
              bsonType: ['bool', 'null'],
              description: 'Inferred: Does the user likely have children? (null if unknown)',
            },
            hasKidsIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredHasKids has been verified by the user',
              default: false // Default to false
            },
            inferredRelationshipStatus: {
              bsonType: ['string', 'null'],
              description: 'Inferred: User relationship status (null if unknown)',
              enum: ['single', 'relationship', 'married', null],
            },
            relationshipStatusIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredRelationshipStatus has been verified by the user',
              default: false
            },
            inferredEmploymentStatus: {
              bsonType: ['string', 'null'],
              description: 'Inferred: User employment status (null if unknown)',
              enum: ['employed', 'unemployed', 'student', null],
            },
            employmentStatusIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredEmploymentStatus has been verified by the user',
              default: false
            },
            inferredEducationLevel: {
              bsonType: ['string', 'null'],
              description: 'Inferred: User education level (null if unknown)',
              enum: ['high_school', 'bachelors', 'masters', 'doctorate', null],
            },
            educationLevelIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredEducationLevel has been verified by the user',
              default: false
            },
            inferredAgeBracket: { // Kept separate from user-provided 'age'
              bsonType: ['string', 'null'],
              description: 'Inferred: User age bracket (null if unknown or age provided)', // Clarified description
              enum: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', null],
            },
            ageBracketIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredAgeBracket has been verified by the user',
              default: false
            },
            inferredGender: { // NEW inferred field
              bsonType: ['string', 'null'],
              description: 'Inferred: User gender identity (null if unknown or gender provided)',
              enum: ['male', 'female', 'non-binary', null], // Note: 'prefer_not_to_say' is user-only
            },
            genderIsVerified: { // NEW verification flag
              bsonType: 'bool',
              description: 'Flag indicating if inferredGender has been verified by the user',
              default: false
            },
          }
        },
        // --- End: Demographic Data Object ---
        preferences: {
          bsonType: 'array',
          description: 'User interests and preferences',
          items: {
            bsonType: 'object',
            required: ['category', 'score'],
            properties: {
              category: { bsonType: 'string' },
              score: {
                bsonType: ['double', 'int'],
                minimum: 0.0,
                maximum: 1.0,
              },
              attributes: {
                bsonType: 'object',
                // Attributes can have any key, and the value is another object
                additionalProperties: {
                  bsonType: 'object',
                  // The inner object has attribute values as keys and scores as values
                  additionalProperties: {
                    bsonType: ['double', 'int'],
                    minimum: 0.0,
                    maximum: 1.0,
                  }
                }
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
            optInStores: { bsonType: 'array', items: { bsonType: 'string' } }, // Specify item type
            optOutStores: { bsonType: 'array', items: { bsonType: 'string' } }, // Specify item type
          },
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  validationLevel: 'moderate', // Changed from 'strict' to 'moderate' during dev if needed
  validationAction: 'warn', // Changed from 'error' to 'warn' during dev if needed
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
                    price: { bsonType: ['double', 'int'] },
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
