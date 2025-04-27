require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbname = process.env.DB_NAME;

let client;
let db;

async function connectDB() {
  if (db) {
    return db;
  }
  try {
    // Instantiate client inside the connect function
    client = new MongoClient(uri);
    await client.connect();
    console.log('MongoDB connected successfully');
    db = client.db(dbname);
    return db;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect
  }
}

function getDB() {
  if (!db) {
    throw new Error('DB not initialized. Call connectDB first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    client = null; // Reset client
    db = null; // Reset db
  }
}

module.exports = { connectDB, getDB, closeDB };
