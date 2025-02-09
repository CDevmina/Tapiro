const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

// Mock MongoDB
jest.mock('mongodb', () => ({
    MongoClient: {
        connect: jest.fn().mockResolvedValue({
            db: jest.fn().mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    findOne: jest.fn(),
                    insertOne: jest.fn(),
                    findOneAndUpdate: jest.fn()
                })
            })
        })
    }
}));

// Mock Redis
jest.mock('redis', () => ({
    createClient: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        set: jest.fn()
    })
}));

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});