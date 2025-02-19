require('dotenv').config();
const path = require('path');
const http = require('http');
const oas3Tools = require('oas3-tools');
const { connectDB } = require('./utils/mongoUtil');
const { connectRedis } = require('./utils/redisUtil');

const serverPort = process.env.PORT || 3000;

// swaggerRouter configuration
const options = {
  routing: {
    controllers: path.join(__dirname, './controllers'),
  },
};

const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yaml'),
  options,
);
const app = expressAppConfig.getApp();

// Initialize MongoDB connection
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
