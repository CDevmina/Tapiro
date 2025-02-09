const js = require('@eslint/js');
const globals = require('globals');

module.exports = {
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2022: true,
        jest: true
    },
    extends: [js.configs.recommended],
    ignorePatterns: ['dist', 'node_modules'],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script'
    },
    globals: {
        ...globals.node,
        ...globals.jest
    },
    rules: {
        'no-console': 'off',
        'indent': ['error', 2],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
    }
};