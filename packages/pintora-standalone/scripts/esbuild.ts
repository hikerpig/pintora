import * as fs from 'fs'
import { execSync } from 'child_process'
import { build, BuildOptions, Plugin, analyzeMetafileSync } from 'esbuild'

// const shouldWatch = process.env.WATCH === 'true'
const shouldBuildAll = process.env.BUILD_ALL === 'true'
const shouldAnalyze = process.env.ANALYZE === 'true'

const globalName = 'pintora'
const options: BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  // watch: shouldWatch ? 'forever' : false,
  format: 'esm',
  globalName,
  sourcemap: 'external',
  treeShaking: true,
  metafile: shouldAnalyze,
}

function genOutputFilePath(formatName: string) {
  return `lib/pintora-standalone.${formatName}.js`
}

const declarationPlugin: Plugin = {
  name: 'TypeScriptDeclarationsPlugin',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length > 0) return
      console.log(`build onEnd, format: ${build.initialOptions.format}`)
      execSync('tsc -d --emitDeclarationOnly')
    })
  },
}

if (shouldBuildAll) {
  // esm
  const esmOptions: BuildOptions = { ...options, outfile: genOutputFilePath('esm') }
  build({
    ...esmOptions,
    plugins: [declarationPlugin],
    minify: true,
  })

  // umd
  buildUmd({ isMinify: true })
} else {
  // only dev
  build({
    ...options,
    outfile: genOutputFilePath('esm'),
    plugins: [declarationPlugin],
  })
}

function buildUmd(opts: { isMinify?: boolean } = {}) {
  const umdOptions: BuildOptions = { ...options, outfile: genOutputFilePath('umd'), minify: opts.isMinify }
  build({
    ...umdOptions,
    write: false,
  }).then(plugBuild => {
    // hack UMD output https://github.com/jacobp100/technicalc-core/blob/master/packages/technicalc-prebuilt/build.js#L88-L109
    const originCode = plugBuild.outputFiles[1].text
    const sourcemapFile = plugBuild.outputFiles[0]

    const varName = '__EXPORTS__'
    let code = originCode
    code = code.replace(/export\s*\{([^{}]+)\}/, (_, inner) => {
      const defaultExport = inner.match(/^([\w$]+) as default$/)
      return defaultExport != null
        ? `var ${varName}=${defaultExport[1]}`
        : `var ${varName}={${inner.replace(/([\w$]+) as ([\w$]+)/g, '$2:$1')}}`
    })
    code = `(()=>{\n${code};\ntypeof module!=='undefined'?module.exports=${varName}:globalThis.${globalName}=${varName}})()`

    fs.writeFileSync(umdOptions.outfile, code)
    fs.writeFileSync(sourcemapFile.path, sourcemapFile.text)

    if (shouldAnalyze) {
      const analyzeResult = analyzeMetafileSync(plugBuild.metafile)
      console.log('analyze', analyzeResult)
    }
  })
}
