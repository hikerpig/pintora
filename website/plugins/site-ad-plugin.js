const isProd = process.env.NODE_ENV === 'production';

module.exports = function () {
  return {
    name: 'pintora-site-ad-plugin',
    injectHtmlTags() {
      if (!isProd) {
        return {};
      }
      return {
        postBodyTags: [
          {
            tagName: 'script',
            attributes: {
              async: true,
              src: `//cdn.carbonads.com/carbon.js?serve=CEADPK77&placement=pintorajsvercelapp`,
              id: '_carbonads_js',
            },
          },
          {
            tagName: 'link',
            attributes: {
              rel: 'stylesheet',
              href: '/style/carbon.css',
            },
          },
        ],
      };
    },
  };
};
