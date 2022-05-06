const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['types/'],
}
