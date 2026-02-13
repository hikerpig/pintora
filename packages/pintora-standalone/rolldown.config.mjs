// @ts-check
import { defineConfig } from 'rolldown'

export default defineConfig([
  // ESM build - 优化版本
  {
    input: './src/index.ts',
    output: {
      format: 'esm',
      file: './lib/pintora-standalone.esm.mjs',
      sourcemap: false,
    },
    platform: 'browser',
  },
  // UMD build (minified) - 优化版本
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
  },
])
