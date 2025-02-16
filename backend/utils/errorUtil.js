const { respondWithCode } = require('./writer.js');

/**
 * Standard API error responses based on OpenAPI spec
 */
const ApiError = {
  BadRequest: (message = 'Bad Request', details = null) => 
    respondWithCode(400, {
      error: 'Bad Request',
      message,
      details
    }),

  Unauthorized: (message = 'Unauthorized', details = null) => 
    respondWithCode(401, {
      error: 'Unauthorized',
      message,
      details
    }),

  Forbidden: (message = 'Forbidden', details = null) => 
    respondWithCode(403, {
      error: 'Forbidden', 
      message,
      details
    }),

  NotFound: (message = 'Not Found', details = null) => 
    respondWithCode(404, {
      error: 'Not Found',
      message,
      details
    }),

  Conflict: (message = 'Conflict', details = null) => 
    respondWithCode(409, {
      error: 'Conflict',
      message,
      details
    }),

  InternalError: (message = 'Internal Server Error', details = null) => 
    respondWithCode(500, {
      error: 'Internal Server Error',
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    })
};

module.exports = { ApiError };