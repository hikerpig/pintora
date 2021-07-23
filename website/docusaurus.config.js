const path = require('path')

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')

const SITE_URL = process.env.SITE_URL || 'https://pintorajs.vercel.app'

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'Pintora',
  tagline: 'An extensible text-to-diagrams library that works in both browser and node.js',
  customFields: {
    keywords: [
      'diagram as code',
      'text tot diagram',
    ],
  },
  url: SITE_URL,
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: '/img/logo.svg',
  organizationName: 'hikerpig', // Usually your GitHub org/user name.
  projectName: 'pintora', // Usually your repo name.
  trailingSlash: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN']
  },
  themeConfig: {
    navbar: {
      title: 'Pintora',
      logo: {
        alt: 'Pintora Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Tutorial',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        { to: `${SITE_URL}/demo/live-editor`, label: 'Live Editor', position: 'right' },
        {
          href: 'https://github.com/hikerpig/pintora',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            // {
            //   label: 'Stack Overflow',
            //   href: 'https://stackoverflow.com/questions/tagged/pintora',
            // },
            {
              label: 'Discord',
              href: 'https://discord.gg/S3PQ6776Mq',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/hikerpig/pintora',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Hikerpig. Built with Docusaurus.`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/hikerpig/pintora/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  themes: [
    require.resolve('./plugins/docusaurus-theme-pintora/index.js'),
  ],
  plugins: [
    [
      'docusaurus-plugin-module-alias',
      {
        alias: {
          '@components': path.resolve(__dirname, 'src/components'),
        },
      },
    ],
    'docusaurus-plugin-less',
    require.resolve('./plugins/webpack5-plugin'),
  ],
}
