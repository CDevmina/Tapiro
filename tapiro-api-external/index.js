require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const oas3Tools = require('oas3-tools');
const cors = require('cors');
const { validateApiKey } = require('./middleware/apiKeyMiddleware');
const { connectDB } = require('./utils/mongoUtil');
const { connectRedis } = require('./utils/redisUtil');
const { createCorsOptions } = require('./utils/corsUtil');

const serverPort = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  [];

// Create CORS options with the whitelist
const corsOptions = createCorsOptions(allowedOrigins);

// swaggerRouter configuration
const options = {
  routing: {
    controllers: path.join(__dirname, './controllers')
  },
  openApiValidator: {
    validateSecurity: {
      handlers: {
        apiKey: validateApiKey,
      },
    },
  },
};

// Create Express app
const app = express();

// Apply CORS middleware
app.use(cors(corsOptions));

// Configure oas3Tools with the OpenAPI spec
const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yaml'),
  options,
);

// Apply middleware
app.use(expressAppConfig.getApp());

// Initialize connections and start the server
connectDB()
  .then(() => connectRedis())
  .then(() => {
    http.createServer(app).listen(serverPort, () => {
      console.log(
        'External API server is listening on port %d (http://localhost:%d)',
        serverPort,
        serverPort,
      );
      console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
      
      // Log CORS configuration
      console.log(`CORS configuration: ${allowedOrigins.length > 0 ? 
        `Restricted to ${allowedOrigins.join(', ')}` : 
        'Allowing all origins'}`);
    });
  })
  .catch((err) => {
    console.error('Startup error:', err);
  });

module.exports = app;