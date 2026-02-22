module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'app.js',
    'schema-utils.js',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 10,
      lines: 70,
      functions: 70,
    },
  },
};