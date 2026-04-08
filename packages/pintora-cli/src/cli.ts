import { PintoraConfig } from '@pintora/standalone'
import consola from 'consola'
import * as fs from 'node:fs'
import * as mime from 'mime-types'
import * as path from 'node:path'
import yargs from 'yargs'
import { SUPPORTED_MIME_TYPES } from './const'
import { runHarnessCaptureBrowser } from './harness/capture-browser'
import { statusToExitCode } from './harness/exit-codes'
import { runHarnessInspectSvg } from './harness/inspect-svg'
import { runHarnessRenderSvg } from './harness/render-svg'
import { render } from './render'

const CWD = process.cwd()

type Config = {
  backgroundColor?: string
  theme: string
}

const defaultConfig: Config = {
  theme: 'default',
}

type CliRenderArgs = {
  input: string
  output?: string
  /** config file path */
  // config?: string
  pixelRatio?: string
  backgroundColor?: string
  theme?: string
  width?: number
}

type HarnessRenderSvgArgs = {
  case?: string
  input?: string
  out: string
}

type HarnessInspectSvgArgs = {
  in: string
  case?: string
  'out-dir': string
}

type HarnessCaptureBrowserArgs = {
  case?: string
  input?: string
  'out-dir': string
  'base-url'?: string
  viewport?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
yargs
  .command<CliRenderArgs>({
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
        describe: 'Background color',
      },
      theme: {
        alias: 't',
        default: 'default',
        describe: 'Pintora theme',
      },
      width: {
        alias: 'w',
        describe: 'Width of output image',
      },
      // config: {
      //   alias: 'c',
      //   describe: 'Config file path',
      // },
    },
    handler: handleRenderCommand,
  })
  .command({
    command: 'harness <command>',
    describe: 'Harness utilities for layout validation',
    builder: y =>
      y
        .command<HarnessRenderSvgArgs>({
          command: 'render-svg',
          describe: 'Render a harness case or input file to svg',
          builder: {
            case: {
              describe: 'Harness case id',
              type: 'string',
            },
            input: {
              describe: 'Input file path',
              type: 'string',
            },
            out: {
              describe: 'Output svg file path',
              type: 'string',
              demandOption: true,
            },
          },
          handler: handleHarnessRenderSvgCommand,
        })
        .command<HarnessInspectSvgArgs>({
          command: 'inspect-svg',
          describe: 'Inspect a rendered svg and emit harness artifacts',
          builder: {
            in: {
              describe: 'Input svg path',
              type: 'string',
              demandOption: true,
            },
            case: {
              describe: 'Harness case id',
              type: 'string',
            },
            'out-dir': {
              describe: 'Output artifact directory',
              type: 'string',
              demandOption: true,
            },
          },
          handler: handleHarnessInspectSvgCommand,
        })
        .command<HarnessCaptureBrowserArgs>({
          command: 'capture-browser',
          describe: 'Capture browser evidence from the preview surface',
          builder: {
            case: { describe: 'Harness case id', type: 'string' },
            input: { describe: 'Input file path', type: 'string' },
            'out-dir': { describe: 'Output artifact directory', type: 'string', demandOption: true },
            'base-url': { describe: 'Preview base URL', type: 'string' },
            viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
          },
          handler: handleHarnessCaptureBrowserCommand,
        })
        .demandCommand(1),
    handler() {},
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

  const outputFilename = path.basename(args.output)
  const mimeType = mime.contentType(outputFilename)
  if (!(mimeType && SUPPORTED_MIME_TYPES.includes(mimeType))) {
    const ext = path.extname(args.output)
    const supportedExts = SUPPORTED_MIME_TYPES.map(t => {
      return `.${mime.extension(t)}`
    })
    consola.error(`Error, output ext '${ext}' is not supported. Please try ${supportedExts.join('/')}`)
    return
  }
  const config = { ...defaultConfig }

  const pintoraConfig: Partial<PintoraConfig> = {}
  if (args.theme) {
    Object.assign(pintoraConfig, {
      themeConfig: {
        theme: args.theme,
      },
    } as Partial<PintoraConfig>)
  }

  try {
    const buf = await render({
      code,
      devicePixelRatio,
      mimeType,
      backgroundColor: args.backgroundColor || config.backgroundColor,
      pintoraConfig,
      width: args.width,
      renderInSubprocess: false,
    })
    if (!buf) {
      consola.error(`Error during generating image`)
      return
    }
    fs.writeFileSync(args.output, buf as string | NodeJS.ArrayBufferView)
    consola.success(`Render success, saved to ${args.output}`)
  } catch (error) {
    console.error(error)
  }
}

async function handleHarnessRenderSvgCommand(args: HarnessRenderSvgArgs) {
  try {
    const result = await runHarnessRenderSvg({
      cwd: CWD,
      caseId: args.case,
      inputFile: args.input,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleHarnessInspectSvgCommand(args: HarnessInspectSvgArgs) {
  try {
    const result = await runHarnessInspectSvg({
      cwd: CWD,
      svgFile: args.in,
      caseId: args.case,
      outDir: args['out-dir'],
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = statusToExitCode(result.status)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleHarnessCaptureBrowserCommand(args: HarnessCaptureBrowserArgs) {
  try {
    const result = await runHarnessCaptureBrowser({
      cwd: CWD,
      caseId: args.case,
      inputFile: args.input,
      outDir: args['out-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

function parseViewport(input?: string) {
  if (!input) return undefined
  const match = /^(\d+)x(\d+)$/.exec(input)
  if (!match) {
    throw new Error(`Invalid viewport: ${input}. Expected WIDTHxHEIGHT`)
  }
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  }
}
