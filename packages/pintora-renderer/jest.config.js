const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  displayName: '@pintora/renderer',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@pintora/core$': '<rootDir>/../pintora-core/src/index.ts',
    '^@pintora/core/(.*)$': '<rootDir>/../pintora-core/src/$1',
    '^@pintora/diagrams$': '<rootDir>/../pintora-diagrams/src/index.ts',
    '^@pintora/diagrams/(.*)$': '<rootDir>/../pintora-diagrams/src/$1',
    '^@pintora/renderer$': '<rootDir>/src/index.ts',
    '^@pintora/renderer/(.*)$': '<rootDir>/src/$1',
  },
}
