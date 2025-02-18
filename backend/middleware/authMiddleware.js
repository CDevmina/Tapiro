const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { writeJson } = require('../utils/writer.js');

const client = jwksClient({
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err, null);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

exports.validateToken = function validateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return writeJson(res, { message: 'Missing token' }, 401);
  }
  jwt.verify(
    token,
    getKey,
    {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        return writeJson(res, { message: 'Invalid token' }, 401);
      }
      req.user = decoded;
      next();
    },
  );
};
