const { defaults } = require('jest-config')
const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'd.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(d3-*|internmap))'],
}
