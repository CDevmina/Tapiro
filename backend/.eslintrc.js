module.exports = {
  extends: 'airbnb-base',
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
    'no-underscore-dangle': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
  },
  env: {
    node: true,
    jest: true,
  },
};
