require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express'); // Import express
const oas3Tools = require('oas3-tools');
const cors = require('cors');
const { auth, checkJwtAndScope } = require('./middleware/authMiddleware');
const { validateApiKey } = require('./middleware/apiKeyMiddleware');
const { connectDB } = require('./utils/mongoUtil');
const { connectRedis } = require('./utils/redisUtil');

const serverPort = process.env.PORT;

// CORS configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL, 'http://localhost:5174'], // Added demo app origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400,
};

// swaggerRouter configuration
const options = {
  routing: {
    controllers: path.join(__dirname, './controllers'),
    middlewares: [auth],
  },
  openApiValidator: {
    validateSecurity: {
      handlers: {
        oauth2: checkJwtAndScope,
        apiKey: validateApiKey,
      },
    },
  },
};

// Create a base Express app instance
const app = express();

// Apply CORS middleware directly to the Express app
app.use(cors(corsOptions));

// Configure oas3Tools with the OpenAPI spec and options
const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yaml'),
  options,
);

// Apply the oas3Tools middleware (router, validator) to the Express app
app.use(expressAppConfig.getApp());

// Initialize connections and start the server
connectDB()
  .then(() => connectRedis())
  .then(() => {
    http.createServer(app).listen(serverPort, () => {
      console.log(
        'Your server is listening on port %d (http://localhost:%d)',
        serverPort,
        serverPort,
      );
      console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
    });
  })
  .catch((err) => {
    console.error('Startup error:', err);
  });

module.exports = app;
