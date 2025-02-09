const js = require('@eslint/js');
const globals = require('globals');

module.exports = {
    env: {
        node: true,
        commonjs: true,
        es2022: true,
        jest: true,
    },
    extends: [
        js.configs.recommended,
        "plugin:node/recommended"
    ],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script"
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
        'semi': ['error', 'always'],
        'node/no-unpublished-require': 'off'
    }
};