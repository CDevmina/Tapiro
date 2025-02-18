const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { expressjwt: jwt2 } = require('express-jwt');

// Authentication middleware
exports.validateToken = jwt2({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_ISSUER_BASE_URL,
  algorithms: ['RS256'],
});
