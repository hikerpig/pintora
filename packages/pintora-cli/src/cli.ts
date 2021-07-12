import * as path from 'path'
import * as fs from 'fs'
import * as mime from 'mime-types'
import yargs from 'yargs'
import consola from 'consola'
import { render, SUPPORTED_MIME_TYPES } from './render'

const CWD = process.cwd()

type Config = {
  backgroundColor: string
}

const defaultConfig: Config = {
  backgroundColor: '#FFF'
}

type CliRenderArgs = {
  source: string
  output?: string
  /** config file path */
  config?: string
  pixelRatio?: string
}

yargs
  .command({
    command: 'render <source>',
    describe: 'Render DSL to diagram image',
    builder: {
      output: {
        alias: 'O',
        describe: 'Output file path',
      },
      config: {
        alias: 'C',
        describe: 'Config file path',
      },
    },
    handler: handleRenderCommand,
  })
  .help()
  .showHelpOnFail(true).argv

async function handleRenderCommand(args: CliRenderArgs) {
  if (!args.output) {
    const sourceBasename = path.basename(args.source)
    const nameWithoutExt = sourceBasename.slice(0, -path.extname(sourceBasename).length)
    args.output = `${nameWithoutExt}.png`
  }
  const devicePixelRatio = args.pixelRatio ? parseFloat(args.pixelRatio): null
  const code = fs.readFileSync(path.resolve(CWD, args.source)).toString()

  const mimeType = mime.contentType(args.output)
  if (!(mimeType && SUPPORTED_MIME_TYPES.includes(mimeType))) {
    const ext = path.extname(args.output)
    const supportedExts = SUPPORTED_MIME_TYPES.map((t) => {
      return `.${mime.extension(t)}`
    })
    consola.error(`Error, output ext '${ext}' is not supported. Please try ${supportedExts.join('/')}`)
    return
  }
  const config = {...defaultConfig}
  const buf = await render({
    code,
    devicePixelRatio,
    mimeType,
    backgroundColor: config.backgroundColor || defaultConfig.backgroundColor,
  })
  if (!buf) {
    consola.error(`Error during generating image`)
    return
  }
  fs.writeFileSync(args.output, buf)
  consola.success(`Render success, saved to ${args.output}`)
}
