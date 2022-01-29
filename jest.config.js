module.exports = {
  reporters: ['default', ['jest-junit', { outputName: 'reports/junit.xml' }]],
  projects: [
    '<rootDir>/packages/pintora-core/jest.config.js',
    '<rootDir>/packages/pintora-diagrams/jest.config.js',
    '<rootDir>/packages/pintora-cli/jest.config.js',
  ],
}
