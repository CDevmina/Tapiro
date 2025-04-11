const { generateAnonymizedId, generateRandomString } = require('../../utils/helperUtil');

describe('Helper Utilities - Unit Tests', () => {
  test('generateAnonymizedId should return 32-char hex string', () => {
    const id = generateAnonymizedId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  test('generateRandomString should return non-empty string', () => {
    const str = generateRandomString();
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });
});
