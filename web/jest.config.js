module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['src/**/*.{js,jsx}'],
  setupFilesAfterEnv: ['<rootDir>/web/setupTests.js']
};