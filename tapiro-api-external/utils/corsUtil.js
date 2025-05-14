const corsUtil = {
  /**
   * Create dynamic CORS options with whitelist support
   * @param {Array} whitelist - Optional list of allowed origins
   * @return {Object} - CORS options object
   */
  createCorsOptions: function(whitelist = []) {
    return {
      origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) {
          return callback(null, true);
        }
        
        // If whitelist is empty, allow all origins
        if (whitelist.length === 0) {
          return callback(null, true);
        }
        
        // Check against whitelist
        if (whitelist.indexOf(origin) !== -1 || whitelist.includes('*')) {
          return callback(null, true);
        }
        
        // Log rejected origins
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-API-Key'],
      credentials: true,
      maxAge: 86400,
    };
  }
};

module.exports = corsUtil;