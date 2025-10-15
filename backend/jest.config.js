module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.test.js'],
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ]
};
