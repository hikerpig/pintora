const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  testMatch: ['**/(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(d3-*|internmap))'],
}
