// Minimal jest.config.js
module.exports = {
  // Testing environment
  testEnvironment: 'jsdom',
  
  // Where to find test files
  testMatch: [
    "**/tests/**/*.test.js",
    "**/?(*.)+(spec|test).js"
  ],
  
  // Display detailed information
  verbose: true
};
