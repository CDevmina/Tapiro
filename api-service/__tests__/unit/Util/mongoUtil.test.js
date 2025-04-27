const { getDB } = require('../../../utils/mongoUtil');

describe('MongoDB Utilities - Unit Tests', () => {
  test('getDB should throw error if DB not initialized', () => {
    expect(() => getDB()).toThrow('DB not initialized. Call connectDB first.');
  });
});
