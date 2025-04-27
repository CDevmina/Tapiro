require('dotenv').config({ path: '.env.test' });

// Mock MongoDB
jest.mock('mongodb', () => {
  // Define a mock ObjectId class/function
  const mockObjectId = jest.fn((id) => ({
    toString: () => id || 'mockObjectIdFromGlobalSetup', // Indicate it's from global setup
    equals: (other) => other.toString() === (id || 'mockObjectIdFromGlobalSetup'),
  }));

  return {
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          // Add common methods used across tests
          findOne: jest.fn(),
          insertOne: jest.fn().mockResolvedValue({ insertedId: 'mockInsertedId' }), // Add default mock result
          findOneAndUpdate: jest.fn(),
          updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }), // Add default mock result
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }), // Add default mock result
          find: jest.fn().mockReturnThis(), // For chaining
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          project: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([]), // Default to empty array
          countDocuments: jest.fn().mockResolvedValue(0), // Default count
          createIndex: jest.fn().mockResolvedValue('indexName'), // Mock index creation
          aggregate: jest.fn().mockReturnThis(), // For aggregation pipeline
        }),
        admin: jest.fn().mockReturnThis(), // For health check ping
        ping: jest.fn().mockResolvedValue({ ok: 1 }), // For health check ping
      }),
      close: jest.fn().mockResolvedValue(), // Mock close method
    })),
    ObjectId: mockObjectId, // Add the ObjectId mock here
  };
});

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
  }),
}));
