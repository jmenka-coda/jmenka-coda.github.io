module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'routes/**/*.js',
    '!src/server/server.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  // Silence console warnings about logging after tests
  setupFiles: ['<rootDir>/tests/console-setup.js']
};
