require('dotenv').config();
const path = require('path');
const http = require('http');
const oas3Tools = require('oas3-tools');
const cors = require('cors');
const { auth, checkJwt } = require('./middleware/authMiddleware');
const { validateApiKey } = require('./middleware/apiKeyMiddleware');
const { connectDB } = require('./utils/mongoUtil');
const { connectRedis } = require('./utils/redisUtil');

const serverPort = process.env.PORT;

// CORS configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400,
};

// swaggerRouter configuration
const options = {
  routing: {
    controllers: path.join(__dirname, './controllers'),
    middlewares: [cors(corsOptions), auth, checkJwt],
  },
  openApiValidator: {
    validateSecurity: {
      handlers: {
        oauth2: checkJwt,
        apiKey: validateApiKey,
      },
    },
  },
};

const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yaml'),
  options,
);
const app = expressAppConfig.getApp();

// Initialize connections
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
