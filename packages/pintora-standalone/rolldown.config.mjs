// @ts-check
import { defineConfig } from 'rolldown'

export default defineConfig([
  // ESM build
  {
    input: './src/index.ts',
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
