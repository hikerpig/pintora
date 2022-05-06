module.exports = {
  reporters: ['default', ['jest-junit', { outputDirectory: './reports' }]],
  projects: [
    '<rootDir>/packages/pintora-core/jest.config.js',
    '<rootDir>/packages/pintora-diagrams/jest.config.js',
    '<rootDir>/packages/pintora-cli/jest.config.js',
    '<rootDir>/packages/pintora-standalone/jest.config.js',
  ],
}
