import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'

const monacoPrefix = `monaco-editor/esm/vs`

const BASE = '/demo/'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), tsconfigPaths(), VitePWA({
    base: BASE,
    manifest: {
      name: 'Pintora Live Editor',
      short_name: 'Pintora',
      description: 'Live editor for pintora text-to-diagram library',
      start_url: '/demo/live-editor/',
      scope: '/demo/',
      icons: [{
        src: '/demo/img/logo.svg',
        sizes: 'any'
      }]
    },
    strategies: 'injectManifest',
    workbox: {
    }
  })],
  base: BASE,
  build: {
    rollupOptions: {
      input: {
        'entries/demo': resolve(__dirname, 'entries/demo/index.html'),
        'live-editor': resolve(__dirname, 'live-editor/index.html')
      },
      output: {
        manualChunks: {
          editorWorker: [`${monacoPrefix}/editor/editor.worker`],
        },
      }
    },
  },
})
