module.exports = {
  testEnvironment: 'node',
  verbose: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'service/**/*.js',
    'controllers/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/__tests__/config/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/config/setupAfterEnv.js'],
};
