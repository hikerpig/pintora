const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    '^@pintora/cli$': '<rootDir>/../pintora-cli/src/index.ts',
  },
}
