import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'
import ViteMkcert from 'vite-plugin-mkcert'
import tailwindcss from '@tailwindcss/vite'

const BASE = '/demo/'

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'

const serverAllow = process.env.SERVER_ALLOW || '..'

const enableHttps = process.env.ENABLE_HTTPS === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRefresh(),
    tsconfigPaths(),
    VitePWA({
      base: BASE,
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Pintora Live Editor',
        short_name: 'Pintora',
        description: 'Live editor for pintora text-to-diagram library',
        start_url: '/demo/live-editor/',
        scope: '/demo/',
        icons: [
          {
            src: '/demo/img/logo.svg',
            sizes: 'any',
          },
        ],
      },
      strategies: 'injectManifest',
      workbox: {},
    }),
    enableHttps
      ? ViteMkcert({
          savePath: './certs', // save the generated certificate into certs directory
        })
      : null,
    tailwindcss(),
  ],
  base: BASE,
  mode,
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: [serverAllow],
    },
    ...(enableHttps
      ? {
          https: {
            cert: './certs/cert.pem',
            key: './certs/dev.pem',
          },
        }
      : null),
  },
  build: {
    rollupOptions: {
      input: {
        'entries/demo': resolve(__dirname, 'entries/demo/index.html'),
        // 'entries/highlight': resolve(__dirname, 'entries/highlight/index.html'),
        preview: resolve(__dirname, 'preview/index.html'),
        'live-editor': resolve(__dirname, 'live-editor/index.html'),
      },
      // output: {
      //   entryFileNames: `assets/[name].js`,
      //   chunkFileNames: `assets/[name].js`,
      //   assetFileNames: `assets/[name].[ext]`,
      // },
    },
  },
})
