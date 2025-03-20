require('dotenv').config();
const { MongoClient } = require('mongodb');
const { userSchema, storeSchema, apiUsageSchema, userDataSchema, SCHEMA_VERSION } = require('./dbSchemas');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbname = process.env.DB_NAME;

let db;

async function getSchemaVersion(db) {
  try {
    // Store schema version in a dedicated collection
    const schemaInfo = await db.collection('app_metadata').findOne({ _id: 'schemaVersion' });
    return schemaInfo ? schemaInfo.version : null;
  } catch (error) {
    console.error('Error checking schema version:', error);
    return null;
  }
}

async function updateSchemaVersion(db) {
  try {
    await db.collection('app_metadata').updateOne(
      { _id: 'schemaVersion' },
      { $set: { version: SCHEMA_VERSION, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`Schema version set to ${SCHEMA_VERSION}`);
  } catch (error) {
    console.error('Error updating schema version:', error);
  }
}

async function setupSchemas(db) {
  try {
    // Check if schema needs to be updated
    const currentVersion = await getSchemaVersion(db);
    
    // If schema version matches current, skip schema application
    if (currentVersion === SCHEMA_VERSION) {
      console.log(`Schema is already at version ${SCHEMA_VERSION}, skipping setup`);
      return;
    }
    
    console.log(`Updating schema from ${currentVersion || 'none'} to ${SCHEMA_VERSION}`);
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Create each collection that doesn't exist yet
    const requiredCollections = ['users', 'stores', 'apiUsage', 'userData', 'app_metadata'];
    for (const collName of requiredCollections) {
      if (!collectionNames.includes(collName)) {
        console.log(`Creating collection: ${collName}`);
        await db.createCollection(collName);
      }
    }
    
    // Apply schema validation to existing collections with additional error handling
    try {
      console.log('Applying user schema validation...');
      await db.command({
        collMod: 'users',
        ...userSchema
      });
    } catch (userSchemaError) {
      console.error('Failed to apply user schema:', userSchemaError);
    }
    
    try {
      console.log('Applying store schema validation...');
      await db.command({
        collMod: 'stores',
        ...storeSchema
      });
    } catch (storeSchemaError) {
      console.error('Failed to apply store schema:', storeSchemaError);
    }
    
    try {
      console.log('Applying API usage schema validation...');
      await db.command({
        collMod: 'apiUsage',
        ...apiUsageSchema
      });
    } catch (apiUsageSchemaError) {
      console.error('Failed to apply API usage schema:', apiUsageSchemaError);
    }
    
    try {
      console.log('Applying user data schema validation...');
      await db.command({
        collMod: 'userData',
        ...userDataSchema
      });
    } catch (userDataSchemaError) {
      console.error('Failed to apply user data schema:', userDataSchemaError);
    }
    
    // Update the schema version
    await updateSchemaVersion(db);
    
    console.log('MongoDB schemas successfully configured');
  } catch (error) {
    console.error('Error in setupSchemas:', error);
  }
}

async function setupIndexes(db) {
  try {
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ auth0Id: 1 }, { unique: true });
    
    // Store indexes
    await db.collection('stores').createIndex({ auth0Id: 1 }, { unique: true });
    await db.collection('stores').createIndex({ email: 1 });
    await db.collection('stores').createIndex({ "apiKeys.prefix": 1 });
    
    // API usage indexes
    await db.collection('apiUsage').createIndex({ apiKeyId: 1, timestamp: -1 });
    await db.collection('apiUsage').createIndex({ storeId: 1, timestamp: -1 });
    
    // User data indexes
    await db.collection('userData').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('userData').createIndex({ email: 1 });
    await db.collection('userData').createIndex({ storeId: 1, timestamp: -1 });
    
    console.log('MongoDB indexes successfully configured');
  } catch (error) {
    console.error('Error setting up indexes:', error);
  }
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbname);
    
    // Set up schemas and indexes
    await setupSchemas(db);
    await setupIndexes(db);

    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

module.exports = { connectDB, getDB };