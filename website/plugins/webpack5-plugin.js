module.exports = function (context, options) {
  return {
    name: 'docusaurus-webpack5-plugin',
    // eslint-disable-next-line
    configureWebpack(config, isServer, utils) {
      return {
        resolve: {
          alias: {
            path: require.resolve('path-browserify'),
          },
          fallback: {
            fs: false,
          },
        },
      };
    },
  };
};
