// Setup file for Jest tests
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

// Configure test database path
process.env.TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test.db');

// Mock console methods to reduce noise during tests
global.originalConsole = { ...console };

// Create a spy that allows specific messages
const originalLog = console.log;
const allowedMessages = ['Connected to SQLite database'];

console.log = jest.fn((...args) => {
  const message = args.join(' ');
  if (allowedMessages.some(allowed => message.includes(allowed))) {
    // Allow database connection messages but don't log after tests
    return;
  }
  originalLog(...args);
});

console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// Override database path before any database operations
process.env.DB_PATH = process.env.TEST_DB_PATH;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(async () => {
  // Restore console
  Object.assign(console, global.originalConsole);

  // Clean up test database if it exists
  const fs = require('fs');
  const testDbPath = process.env.TEST_DB_PATH;
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      console.error('Failed to clean up test database:', error);
    }
  }
});
