const helperUtil = require('../../utils/helperUtil');

describe('HelperUtil', () => {
    describe('generateAnonymizedId', () => {
        it('should generate a 32 character hex string', () => {
            const id = helperUtil.generateAnonymizedId();
            expect(id).toHaveLength(32);
            expect(typeof id).toBe('string');
        });
    });

    describe('generateRandomString', () => {
        it('should generate a random string of length 16', () => {
            const randomString = helperUtil.generateRandomString();
            expect(randomString).toHaveLength(16);
            expect(typeof randomString).toBe('string');
        });
    });
});