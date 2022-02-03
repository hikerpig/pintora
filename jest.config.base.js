module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  coveragePathIgnorePatterns: ['node_modules', '__tests__'],
  transform: {
    '\\.[jt]sx?$': [
      'esbuild-jest',
      {
        sourcemap: true,
        loaders: {
          '.spec.ts': 'tsx',
        },
      },
    ],
  },
}
