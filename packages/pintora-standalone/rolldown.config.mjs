// @ts-check
import { mkdir, writeFile } from 'node:fs/promises'
import { defineConfig } from 'rolldown'
import { isolatedDeclarationPlugin } from 'rolldown/experimental'

const entryDtsDir = new URL('./types/', import.meta.url)
const entryDtsFile = new URL('./types/index.d.ts', import.meta.url)

function writeEntryDtsPlugin() {
  /** @type {string | undefined} */
  let entryDtsSource

  return {
    name: 'write-entry-dts',
    generateBundle(_options, bundle) {
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && fileName === 'src/index.d.ts') {
          entryDtsSource = String(asset.source)
          delete bundle[fileName]
        }
      }
    },
    async writeBundle() {
      if (entryDtsSource) {
        await mkdir(entryDtsDir, { recursive: true })
        await writeFile(entryDtsFile, entryDtsSource)
      }
    },
  }
}

export default defineConfig([
  // ESM build
  {
    input: './src/index.ts',
    plugins: [isolatedDeclarationPlugin(), writeEntryDtsPlugin()],
    output: {
      format: 'esm',
      file: './lib/pintora-standalone.esm.mjs',
      sourcemap: false,
    },
    platform: 'browser',
    resolve: {
      // Bundle all dependencies (no external)
    },
  },
  // UMD build (minified)
  {
    input: './src/index.ts',
    output: {
      format: 'umd',
      file: './lib/pintora-standalone.umd.js',
      name: 'pintora',
      sourcemap: false,
      minify: true,
    },
    platform: 'browser',
    resolve: {
      // Bundle all dependencies (no external)
    },
  },
])
