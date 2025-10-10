module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.test.js'],
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ]
};
