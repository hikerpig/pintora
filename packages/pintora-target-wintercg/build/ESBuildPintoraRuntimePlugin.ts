import * as fs from 'fs'
import { Plugin } from 'esbuild'

const RUNTIME_CODE_NS = 'pintora-runtime-code'

export function makeESBuildNodePolyfillsPlugin(opts: { runtimeLibPath: string }) {
  return {
    name: 'ESBuildNodePolyfillsPlugin',
    setup(build) {
      build.onResolve({ filter: /virtual:pintora/ }, args => {
        return { namespace: RUNTIME_CODE_NS, path: opts.runtimeLibPath }
      })
      build.onLoad({ filter: /.*/, namespace: RUNTIME_CODE_NS }, args => {
        const contents = fs.readFileSync(opts.runtimeLibPath)
        return {
          contents,
        }
      })
    },
  } as Plugin
}
