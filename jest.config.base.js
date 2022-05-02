module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  coveragePathIgnorePatterns: ['node_modules', '__tests__'],
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(d3-*|internmap))'],
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
