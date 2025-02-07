const crypto = require('crypto');

exports.generateAnonymizedId = function () {
    return crypto.randomBytes(16).toString('hex');
};

// Keep existing functions
exports.generateRandomString = function () {
    return Math.random().toString(36).substring(2, 15);
};