import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import tsconfigPaths from 'vite-tsconfig-paths'

const monacoPrefix = `monaco-editor/esm/vs`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), tsconfigPaths()],
  base: '/demo/',
  build: {
    rollupOptions: {
      input: {
        'entries/demo': resolve(__dirname, 'entries/demo/index.html'),
        'live-editor': resolve(__dirname, 'live-editor/index.html')
      },
      output: {
        manualChunks: {
          jsonWorker: [`${monacoPrefix}/language/json/json.worker`],
          cssWorker: [`${monacoPrefix}/language/css/css.worker`],
          htmlWorker: [`${monacoPrefix}/language/html/html.worker`],
          tsWorker: [`${monacoPrefix}/language/typescript/ts.worker`],
          editorWorker: [`${monacoPrefix}/editor/editor.worker`],
        },
      }
    },
  },
})
