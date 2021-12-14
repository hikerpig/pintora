import * as path from 'path'
import * as fs from 'fs'
import * as mime from 'mime-types'
import yargs from 'yargs'
import consola from 'consola'
import { render } from './render'
import { SUPPORTED_MIME_TYPES } from './const'

const CWD = process.cwd()

type Config = {
  backgroundColor: string
}

const defaultConfig: Config = {
  backgroundColor: '#FFF',
}

type CliRenderArgs = {
  input: string
  output?: string
  /** config file path */
  // config?: string
  pixelRatio?: string
  backgroundColor?: string
}

yargs
  .command({
    command: 'render',
    describe: 'Render DSL to diagram image',
    builder: {
      input: {
        alias: 'i',
        describe: 'Input file path',
        required: true,
      },
      output: {
        alias: 'o',
        describe: 'Output file path',
      },
      'pixel-ratio': {
        alias: 'p',
        default: 2,
        describe: 'Pixel ratio',
      },
      'background-color': {
        alias: 'b',
        default: '#fff',
        describe: 'Background color',
      },
      // config: {
      //   alias: 'c',
      //   describe: 'Config file path',
      // },
    },
    handler: handleRenderCommand,
  })
  .help()
  .showHelpOnFail(true).argv

async function handleRenderCommand(args: CliRenderArgs) {
  // consola.log('args', args)
  if (!args.output) {
    const sourceBasename = path.basename(args.input)
    const nameWithoutExt = sourceBasename.slice(0, -path.extname(sourceBasename).length)
    args.output = `${nameWithoutExt}.png`
  }
  const devicePixelRatio = args.pixelRatio ? parseFloat(args.pixelRatio) : null
  const code = fs.readFileSync(path.resolve(CWD, args.input)).toString()

  const mimeType = mime.contentType(args.output)
  if (!(mimeType && SUPPORTED_MIME_TYPES.includes(mimeType))) {
    const ext = path.extname(args.output)
    const supportedExts = SUPPORTED_MIME_TYPES.map(t => {
      return `.${mime.extension(t)}`
    })
    consola.error(`Error, output ext '${ext}' is not supported. Please try ${supportedExts.join('/')}`)
    return
  }
  const config = { ...defaultConfig }
  const buf = await render({
    code,
    devicePixelRatio,
    mimeType,
    backgroundColor: args.backgroundColor || config.backgroundColor,
  })
  if (!buf) {
    consola.error(`Error during generating image`)
    return
  }
  fs.writeFileSync(args.output, buf)
  consola.success(`Render success, saved to ${args.output}`)
}
