import * as path from 'path'
import { Plugin } from 'esbuild'

const nodeModulesDir = path.resolve(__dirname, '../node_modules')

export const ESBuildNodePolyfillsPlugin: Plugin = {
  name: 'ESBuildNodePolyfillsPlugin',
  setup(build) {
    const nodeGlobalsToBeIgnored = /^((tls)|(assert)|(fs)|(net))$/
    build.onResolve({ filter: nodeGlobalsToBeIgnored }, args => {
      return { path: args.path, namespace: 'do-nothing' }
    })

    // build.onResolve({ filter: /node:path/ }, args => {
    //   return { namespace: 'path-browserify' }
    // })

    // Resolve Stream Modules
    build.onResolve(
      {
        filter: /(_stream_duplex)|(_stream_passthrough)|(_stream_readable)|(_stream_transform)|(_stream_writable)/,
      },
      args => {
        const pPrefix = [nodeModulesDir, 'readable-stream', 'lib']
        let p
        if (args.path.includes('_stream_duplex')) p = path.join(...pPrefix, '_stream_duplex.js')
        if (args.path.includes('_stream_passthrough')) p = path.join(...pPrefix, '_stream_passthrough.js')
        if (args.path.includes('_stream_readable')) p = path.join(...pPrefix, '_stream_readable.js')
        if (args.path.includes('_stream_transform')) p = path.join(...pPrefix, '_stream_transform.js')
        if (args.path.includes('_stream_writable')) p = path.join(...pPrefix, '_stream_writable.js')
        return { path: p }
      },
    )

    // // Special Case for the "SAP Cloud SDK for JavaScript"
    // build.onResolve({ filter: /.*\/internal\/streams\/stream/ }, (args) => ({
    //   path: path.join(__dirname, "../", "stream-browserify", "index.js"),
    // }));

    // Resolve other packages
    build.onResolve(
      {
        filter:
          /^((buffer)|(crypto)|(http)|(https)|(os)|(path)|(node:path)|(stream)|(zlib)|(url)|(events)|(process)|(util))$/,
      },
      args => {
        const pPrefix = [nodeModulesDir]
        let p
        switch (args.path) {
          case 'buffer':
            p = path.join(...pPrefix, 'buffer', 'index.js')
            break
          case 'crypto':
            p = path.join(...pPrefix, 'crypto-browserify', 'index.js')
            break
          case 'http':
            p = path.join(...pPrefix, 'stream-http', 'index.js')
            break
          case 'https':
            p = path.join(...pPrefix, 'https-browserify', 'index.js')
            break
          case 'os':
            p = path.join(...pPrefix, 'os-browserify', 'browser.js')
            break
          case 'node:path':
            p = path.join(...pPrefix, 'path-browserify', 'index.js')
            break
          case 'path':
            p = path.join(...pPrefix, 'path-browserify', 'index.js')
            break
          // case "stream":
          //   p = path.join(...pPrefix, "stream-browserify", "index.js");
          //   break;
          case 'zlib':
            p = path.join(...pPrefix, 'browserify-zlib', 'lib', 'index.js')
            break
          case 'events':
            p = path.join(...pPrefix, 'events', 'events.js')
            break
          case 'process':
            p = path.join(...pPrefix, 'process', 'browser.js')
            break
          case 'util':
            p = path.join(...pPrefix, 'util', 'util.js')
            break
        }
        if (p) {
          return { path: p, external: false }
        }
      },
    )

    // Do nothing on specified fields
    build.onLoad({ filter: /.*/, namespace: 'do-nothing' }, args => ({
      contents: 'export default false;',
    }))
  },
}
