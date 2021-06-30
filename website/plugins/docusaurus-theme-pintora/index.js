const path = require('path');

function theme() {
  return {
    name: 'docusaurus-theme-pintora',

    getThemePath() {
      return path.resolve(__dirname, './theme');
    },

    configureWebpack() {
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
}

module.exports = theme;
