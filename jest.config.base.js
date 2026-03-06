module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  coveragePathIgnorePatterns: ['node_modules', '__tests__'],
  transformIgnorePatterns: [
    '/node_modules/.pnpm/(?!(d3-.*|internmap|@exodus\\+bytes|@asamuzakjp\\+.*|@csstools\\+.*|parse5)@)',
  ],
  transform: {
    '\\.(mjs|[jt]sx?)$': [
      'esbuild-jest',
      {
        sourcemap: true,
        loaders: {
          '.spec.ts': 'tsx',
          '.mjs': 'js',
        },
      },
    ],
  },
}
