module.exports = {
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
