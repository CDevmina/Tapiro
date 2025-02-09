const crypto = require('crypto');

exports.generateAnonymizedId = function () {
    return crypto.randomBytes(16).toString('hex');
};

exports.generateRandomString = function () {
    return Math.random().toString(36).substring(2, 15);
};