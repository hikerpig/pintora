module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  transform: {
    '\\.[jt]sx?$': [
      'esbuild-jest',
      {
        loaders: {
          '.spec.ts': 'tsx',
        },
      },
    ],
  },
}
