import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test timeout
jest.setTimeout(30000);

// Mock console methods in test
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Setup default test user credentials if not in env
if (!process.env.AUTH_SERVICE_URL) {
  process.env.AUTH_SERVICE_URL = 'http://localhost:3001/api';
}
if (!process.env.CONTENT_SERVICE_URL) {
  process.env.CONTENT_SERVICE_URL = 'http://localhost:3003/api';
}
if (!process.env.PAYMENT_SERVICE_URL) {
  process.env.PAYMENT_SERVICE_URL = 'http://localhost:3002/api';
}
if (!process.env.RECOMMENDATION_SERVICE_URL) {
  process.env.RECOMMENDATION_SERVICE_URL = 'http://localhost:3004/api';
}
