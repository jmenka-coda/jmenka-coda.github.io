// Setup console mocking before Jest setup
const originalConsoleLog = console.log;
let testFinished = false;

// Mock console.log to suppress database messages after tests
console.log = (...args) => {
  const message = args.join(' ');

  // Allow logging during tests, but suppress after test completion
  if (!testFinished && message.includes('Connected to SQLite database')) {
    return;
  }

  originalConsoleLog(...args);
};

// Mark when tests are done
process.on('exit', () => {
  testFinished = true;
});

// Also listen for Jest's test completion
if (typeof afterAll === 'function') {
  afterAll(() => {
    testFinished = true;
  });
}
