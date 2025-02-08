const crypto = require('crypto');

exports.generateAnonymizedId = function () {
    return crypto.randomBytes(16).toString('hex');
};

function generateRandomString() {
    return Math.random().toString(36).substring(2, 13).slice(0, 11);
}