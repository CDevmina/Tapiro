const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    {
        ignores: ['dist', 'node_modules'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.node,
                ...globals.jest
            }
        },
        files: ['**/*.{js,jsx,ts,tsx}'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended
        ],
        rules: {
            'no-console': 'off',
            'indent': ['error', 2],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always']
        }
    }
);