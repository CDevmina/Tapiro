require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbname = process.env.DB_NAME;

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbname);

    // Users Collection
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ 'preferences.categories': 1 });
    await db.collection('users').createIndex({
      'preferences.purchase_history.store_id': 1,
      'preferences.purchase_history.timestamp': -1,
    });

    // Advertisements Collection
    await db.collection('advertisements').createIndex({ storeId: 1 });
    await db.collection('advertisements').createIndex({
      'validity_period.end': 1,
      'validity_period.start': 1,
    });
    await db.collection('advertisements').createIndex({ target_categories: 1 });
    await db.collection('advertisements').createIndex({
      storeId: 1,
      'validity_period.end': 1,
      status: 1,
    });

    // Analytics Collection (New)
    await db.collection('analytics').createIndex({
      storeId: 1,
      timestamp: -1,
    });
    await db.collection('analytics').createIndex({
      type: 1,
      storeId: 1,
      'metrics.category': 1,
    });

    // QR Codes Collection (New)
    await db.collection('qrcodes').createIndex({
      storeId: 1,
      expiresAt: 1,
    });
    await db.collection('qrcodes').createIndex(
      {
        code: 1,
      },
      { unique: true },
    );

    // Create TTL index for analytics
    await db.collection('analytics').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 2592000 }, // 30 days
    );

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
