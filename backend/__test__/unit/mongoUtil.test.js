const mongoUtil = require('../../utils/mongoUtil');
const { MongoClient } = require('mongodb');

jest.mock('mongodb', () => {
    const mockDb = {
        collection: jest.fn().mockReturnValue({}),
    };
    const mockClient = {
        connect: jest.fn().mockResolvedValue(),
        db: jest.fn().mockReturnValue(mockDb),
        close: jest.fn().mockResolvedValue(),
    };
    return {
        MongoClient: jest.fn().mockImplementation(() => mockClient),
    };
});

describe('mongoUtil', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should connect to MongoDB', async () => {
        await mongoUtil.connectDB();
        // Get the instance created by the mock constructor
        const instance = MongoClient.mock.instances[0];
        expect(instance.connect).toHaveBeenCalled();
    });

    it('should get the database instance', async () => {
        await mongoUtil.connectDB();
        const db = mongoUtil.getDB();
        expect(db).toBeDefined();
    });
});

function generateRandomString() {
    return Math.random().toString(36).substring(2, 13); // This returns 11 characters?
}