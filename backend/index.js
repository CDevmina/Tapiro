'use strict';

var path = require('path');
var http = require('http');
const { connectDB } = require('./utils/mongoUtil');
const { connectRedis } = require('./utils/redisUtil');
const { auth, validateToken } = require('./middleware/authMiddleware');
require('dotenv').config();

var oas3Tools = require('oas3-tools');
var serverPort = process.env.PORT;

// swaggerRouter configuration
var options = {
    routing: {
        controllers: path.join(__dirname, './controllers')
    },
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
var app = expressAppConfig.getApp();

// Apply auth middleware
app.use(auth);
app.use('/users', validateToken);

// Initialize MongoDB connection
connectDB()
    .then(() => connectRedis())
    .then(() => {
        http.createServer(app).listen(serverPort, function () {
            console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
            console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
        });
    })
    .catch(err => {
        console.error('Startup error:', err);
    });