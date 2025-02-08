const mongoUtil = require('../../utils/mongoUtil');
const { MongoClient } = require('mongodb');

jest.mock('mongodb', () => {
    const actualMongodb = jest.requireActual('mongodb');
    const mockClient = {
        connect: jest.fn().mockResolvedValue(), // Mock connect to return a promise
        db: jest.fn().mockReturnValue({}),
    };
    return {
        ...actualMongodb,
        MongoClient: jest.fn().mockImplementation(() => mockClient),
    };
});

describe('mongoUtil', () => {
    let client;

    beforeEach(() => {
        client = new MongoClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should connect to MongoDB', async () => {
        await mongoUtil.connectDB();
        expect(client.connect).toHaveBeenCalled();
    });

    it('should get the database instance', async () => {
        await mongoUtil.connectDB();
        const db = mongoUtil.getDB();
        expect(client.db).toHaveBeenCalled();
        expect(typeof db).toBe('object');
    });

    it('should throw an error if the database is not initialized', () => {
        expect(() => mongoUtil.getDB()).toThrowError('Database not initialized. Call connectDB first.');
    });
});