/* eslint-disable @typescript-eslint/no-require-imports */
const { defaults } = require('jest-config')
const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'd.ts'],
  moduleNameMapper: {
    '^@pintora/renderer$': '<rootDir>/../pintora-renderer/src/index.ts',
    '^@pintora/renderer/(.*)$': '<rootDir>/../pintora-renderer/src/$1',
  },
  testEnvironment: 'jsdom',
  testMatch: ['**/(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(d3-*|internmap))'],
}
