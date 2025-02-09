const crypto = require('crypto');

exports.generateAnonymizedId = function generateAnonymizedId() {
  return crypto.randomBytes(16).toString('hex');
};

// Keep existing functions
exports.generateRandomString = function generateRandomString() {
  return Math.random().toString(36).substring(2, 15);
};
