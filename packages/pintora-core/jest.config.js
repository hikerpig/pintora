const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  // testEnvironment: 'jsdom',
  testMatch: ['**/(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: ['/node_modules/(?!(d3-*))'],
}
