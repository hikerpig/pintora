import baseConfig from '../../jest.config.base'

export default {
  ...baseConfig,
  testEnvironment: 'jsdom',
  testMatch: ['**/(*.)+(spec|test).[jt]s?(x)'],
}
