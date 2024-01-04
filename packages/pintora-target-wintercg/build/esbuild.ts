import * as path from 'path'
import { build, BuildOptions, BuildResult } from 'esbuild'
import { ESBuildNodePolyfillsPlugin } from './ESBuildNodePolyfillsPlugin'
import { writeFileSync } from 'fs'

const packageDir = path.resolve(__dirname, '..')
const aliasDir = path.resolve(__dirname, '../aliases')

const distDir = path.join(packageDir, 'dist')
const iifeOutFilePath = path.join(packageDir, 'dist/runtime.iife.js')

const baseOptions: BuildOptions = {
  entryPoints: ['runtime/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'pintoraTarget',
  sourcemap: false,
  treeShaking: true,
  alias: {
    canvas: path.join(aliasDir, 'canvas.js'),
    fs: path.join(aliasDir, 'canvas.js'),
    'node:url': path.join(aliasDir, 'url.js'),

    // bundle standalone with esbuild, and alias g-canvas out because we don't canvas yet
    '@pintora/standalone': path.join(packageDir, '../pintora-standalone/src/index.ts'),
    '@antv/g-canvas': path.join(aliasDir, 'canvas.js'),
  },
  plugins: [ESBuildNodePolyfillsPlugin],
  loader: {
    '.ttf': 'binary',
  },
  write: true,
}

const outputConfigs: Array<Partial<BuildOptions>> = [
  {
    format: 'esm',
    outfile: path.join(distDir, 'runtime.esm.js'),
    metafile: true,
  },
  {
    format: 'iife',
    outfile: iifeOutFilePath,
  },
]
const buildPromises = outputConfigs.map(c => {
  const options = {
    ...baseOptions,
    ...c,
  }
  return build(options)
})

Promise.all(buildPromises).then(afterLibEsbuild)

async function afterLibEsbuild(builds: BuildResult[]) {
  const firstBuild = builds[0]
  writeFileSync('build-meta.json', JSON.stringify(firstBuild.metafile))
  //   console.log('afterLibEsbuild, generate platform code')
  //   const runtimeLibCode = fs.readFileSync(iifeOutFilePath, 'utf-8').toString()
  //   const outdir = path.join(packageDir, 'dist/platforms')
  //   if (!fs.existsSync(outdir)) {
  //     fs.mkdirSync(outdir)
  //   }
  //   const handlerCode = fs.readFileSync(path.join(packageDir, 'runtime/platforms/edge-handler.js'))
  //   const finalCode = `
  // ${runtimeLibCode}
  // // separation
  // ${handlerCode}
  //   `
  //   fs.writeFileSync(path.join(packageDir, 'dist/platforms/edge-handler.js'), finalCode)
}
