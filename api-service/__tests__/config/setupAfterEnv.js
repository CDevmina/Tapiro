const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const redisMock = require('redis-mock'); // Use redis-mock

// --- Mock Core Utilities ---

// Mock MongoDB Utility
jest.mock('/Users/cdevmina/Projects/Tapiro/api-service/utils/mongoUtil.js', () => {
  const originalMongoUtil = jest.requireActual(
    '/Users/cdevmina/Projects/Tapiro/api-service/utils/mongoUtil.js',
  );
  let mockDb; // Variable to hold the mock DB instance
  let mongoServer; // In-memory server instance
  let client; // MongoClient instance

  return {
    // Keep original connectDB logic but adapt it for in-memory
    connectDB: jest.fn(async () => {
      if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        client = new MongoClient(uri);
        await client.connect();
        mockDb = client.db('tapiro-test'); // Use a specific test DB name
        console.log('Mock MongoDB Connected:', uri);
      }
      // You might want to call the original setupSchemas/Indexes here if needed for tests
      // await originalMongoUtil.setupSchemas(mockDb); // Example - adapt as needed
      // await originalMongoUtil.setupIndexes(mockDb); // Example - adapt as needed
    }),
    getDB: jest.fn(() => {
      if (!mockDb) {
        throw new Error('Mock DB not initialized. Call connectDB first in your test setup.');
      }
      return mockDb;
    }),
    // You might need to mock other exports if your tests rely on them directly
    // e.g., getSchemaVersion, updateSchemaVersion
    __disconnectDB: jest.fn(async () => {
      // Helper for cleanup
      if (client) {
        await client.close();
        client = null;
        mockDb = null;
        console.log('Mock MongoClient closed.');
      }
      if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
        console.log('Mock MongoMemoryServer stopped.');
      }
    }),
  };
});

// Mock Redis Utility using redis-mock
const mockRedisClient = redisMock.createClient();
jest.mock('/Users/cdevmina/Projects/Tapiro/api-service/utils/redisUtil.js', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined), // Simulate successful connection
  getCache: jest.fn((key) => mockRedisClient.get(key)),
  setCache: jest.fn((key, value, options) => mockRedisClient.set(key, value, options)),
  invalidateCache: jest.fn((key) => mockRedisClient.set(key, '', { EX: 1 })), // Simulate invalidation
  pingRedis: jest.fn(() => mockRedisClient.ping()),
  client: mockRedisClient, // Export the mock client if needed
}));

// Mock Auth0 Utility
jest.mock('/Users/cdevmina/Projects/Tapiro/api-service/utils/auth0Util.js', () => ({
  getManagementToken: jest.fn().mockResolvedValue('mock-management-token'),
  assignUserRole: jest.fn().mockResolvedValue(undefined),
  linkAccounts: jest.fn().mockResolvedValue({}),
  updateUserMetadata: jest.fn().mockResolvedValue({}),
  updateUserPhone: jest.fn().mockResolvedValue({}),
  getUserMetadata: jest.fn().mockResolvedValue({ registrationComplete: true }),
  updateAuth0Username: jest.fn().mockResolvedValue({}),
  deleteAuth0User: jest.fn().mockResolvedValue(undefined),
}));

// Mock Auth Utility (Token Validation / User Info)
jest.mock('/Users/cdevmina/Projects/Tapiro/api-service/utils/authUtil.js', () => ({
  getUserData: jest.fn().mockResolvedValue({
    sub: 'auth0|mockuser123',
    email: 'test@example.com',
    nickname: 'testuser',
    // Add other fields your services might expect
  }),
  validateUserScopes: jest.fn().mockResolvedValue(true), // Assume valid scopes by default
  ROLE_PERMISSIONS: jest.requireActual(
    '/Users/cdevmina/Projects/Tapiro/api-service/utils/authUtil.js',
  ).ROLE_PERMISSIONS, // Keep actual permissions map
}));

// Mock AI Service Client
jest.mock('/Users/cdevmina/Projects/Tapiro/api-service/clients/AIService.js', () => ({
  processUserData: jest.fn().mockResolvedValue({ status: 'processed' }),
  checkHealth: jest.fn().mockResolvedValue({ status: 'connected' }),
}));

// --- Global Hooks ---

// Optional: Connect mock DB before all tests if needed globally
// beforeAll(async () => {
//   const mongoUtil = require('/Users/cdevmina/Projects/Tapiro/api-service/utils/mongoUtil.js');
//   await mongoUtil.connectDB();
// });

// Clear mocks and potentially clean mock DB/Redis before each test
beforeEach(async () => {
  // Clear all mock function calls, instances, etc.
  jest.clearAllMocks();

  // Clear redis-mock data before each test
  await new Promise((resolve) => mockRedisClient.flushall(resolve));

  // Optional: Clear specific DB collections if needed (more granular than full disconnect)
  // const mongoUtil = require('/Users/cdevmina/Projects/Tapiro/api-service/utils/mongoUtil.js');
  // const db = mongoUtil.getDB();
  // if (db) {
  //   await db.collection('users').deleteMany({});
  //   await db.collection('stores').deleteMany({});
  //   // ... clear other collections used in tests
  // }
});

// Disconnect mock DB after all tests
afterAll(async () => {
  const mongoUtil = require('/Users/cdevmina/Projects/Tapiro/api-service/utils/mongoUtil.js');
  if (mongoUtil.__disconnectDB) {
    await mongoUtil.__disconnectDB();
  }
  // Close redis-mock client
  await new Promise((resolve) => mockRedisClient.quit(resolve));
  console.log('Mock Redis client closed.');
});

console.log('Jest setupAfterEnv: Global mocks and hooks configured.');
