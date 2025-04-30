// Set default Node environment for tests
process.env.NODE_ENV = 'test';

// Mock sensitive or environment-specific variables if necessary
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapiro-test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'test-domain.auth0.com';
process.env.AUTH0_ISSUER_BASE_URL =
  process.env.AUTH0_ISSUER_BASE_URL || 'https://test-domain.auth0.com';
process.env.AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || 'test-m2m-client-id';
process.env.AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || 'test-m2m-secret';
process.env.AUTH0_USER_ROLE_ID = process.env.AUTH0_USER_ROLE_ID || 'test-user-role';
process.env.AUTH0_STORE_ROLE_ID = process.env.AUTH0_STORE_ROLE_ID || 'test-store-role';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://mock-ai-service/api';
process.env.AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || 'test-ai-key';

console.log('Jest setup: Environment configured for test.');
