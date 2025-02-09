module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '\\.(css|less)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
};