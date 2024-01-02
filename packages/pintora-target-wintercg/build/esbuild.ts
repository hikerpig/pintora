import * as path from 'path'
import * as fs from 'fs'
import { build, BuildOptions } from 'esbuild'
import { ESBuildNodePolyfillsPlugin } from './ESBuildNodePolyfillsPlugin'

const packageDir = path.resolve(__dirname, '..')
const aliasDir = path.resolve(__dirname, '../aliases')

const runtimeOutFilePath = path.join(packageDir, 'dist/runtime.js')

const options: BuildOptions = {
  entryPoints: ['runtime/index.ts'],
  bundle: true,
  outfile: runtimeOutFilePath,
  format: 'iife',
  globalName: 'pintoraTarget',
  sourcemap: false,
  treeShaking: true,
  alias: {
    canvas: path.join(aliasDir, 'canvas.js'),
    fs: path.join(aliasDir, 'canvas.js'),
    'node:url': path.join(aliasDir, 'url.js'),
  },
  plugins: [ESBuildNodePolyfillsPlugin],
  loader: {
    '.ttf': 'binary',
  },
  write: true,
}

build(options).then(afterLibEsbuild)

async function afterLibEsbuild() {
  console.log('afterLibEsbuild, generate platform code')
  const runtimeLibCode = fs.readFileSync(runtimeOutFilePath, 'utf-8').toString()
  const outdir = path.join(packageDir, 'dist/platforms')
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir)
  }
  const handlerCode = fs.readFileSync(path.join(packageDir, 'runtime/platforms/edge-handler.js'))
  const finalCode = `
${runtimeLibCode}
// separation
${handlerCode}
  `
  fs.writeFileSync(path.join(packageDir, 'dist/platforms/edge-handler.js'), finalCode)
}
