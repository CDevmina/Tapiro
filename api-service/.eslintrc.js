module.exports = {
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  Plugins: ['prettier'],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
    'no-underscore-dangle': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'prettier/prettier': 'error',
  },
  env: {
    node: true,
    jest: true,
  },
};
