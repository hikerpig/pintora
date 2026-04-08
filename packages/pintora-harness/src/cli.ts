import consola from 'consola'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { statusToExitCode } from './exit-codes'
import type { CaptureViewport } from './contracts/browser'

const CWD = process.cwd()

type RenderSvgArgs = {
  case?: string
  input?: string
  out: string
}

type InspectSvgArgs = {
  in: string
  case?: string
  'out-dir': string
}

type CaptureBrowserArgs = {
  case?: string
  input?: string
  'out-dir': string
  'base-url'?: string
  viewport?: string
}

type SummarizeCaseArgs = {
  artifacts: string
  out: string
}

const parser = yargs(hideBin(process.argv))
  .scriptName('pintora-harness')
  .exitProcess(false)
  .strictCommands()
  .command<RenderSvgArgs>({
    command: 'render-svg',
    describe: 'Render a harness case or input file to svg',
    builder: {
      case: { describe: 'Harness case id', type: 'string' },
      input: { describe: 'Input file path', type: 'string' },
      out: { describe: 'Output svg file path', type: 'string', demandOption: true },
    },
    handler: handleRenderSvgCommand,
  })
  .command<InspectSvgArgs>({
    command: 'inspect-svg',
    describe: 'Inspect a rendered svg and emit harness artifacts',
    builder: {
      in: { describe: 'Input svg path', type: 'string', demandOption: true },
      case: { describe: 'Harness case id', type: 'string' },
      'out-dir': { describe: 'Output artifact directory', type: 'string', demandOption: true },
    },
    handler: handleInspectSvgCommand,
  })
  .command<CaptureBrowserArgs>({
    command: 'capture-browser',
    describe: 'Capture browser evidence from the preview surface',
    builder: {
      case: { describe: 'Harness case id', type: 'string' },
      input: { describe: 'Input file path', type: 'string' },
      'out-dir': { describe: 'Output artifact directory', type: 'string', demandOption: true },
      'base-url': { describe: 'Preview base URL', type: 'string' },
      viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
    },
    handler: handleCaptureBrowserCommand,
  })
  .command<SummarizeCaseArgs>({
    command: 'summarize-case',
    describe: 'Summarize harness artifacts into summary.json',
    builder: {
      artifacts: { describe: 'Harness artifacts directory', type: 'string', demandOption: true },
      out: { describe: 'Output summary file path', type: 'string', demandOption: true },
    },
    handler: handleSummarizeCaseCommand,
  })
  .fail((message, error) => {
    const output = message || error?.message
    if (output) consola.error(output)
    process.exitCode = 1
  })
  .help()
  .showHelpOnFail(true)
  .demandCommand(1)
try {
  parser.parse()
} catch {
  process.exitCode = process.exitCode || 1
}

async function handleRenderSvgCommand(args: RenderSvgArgs) {
  try {
    const { runHarnessRenderSvg } = require('./rendering/render-svg') as typeof import('./rendering/render-svg')
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

async function handleInspectSvgCommand(args: InspectSvgArgs) {
  try {
    const { runHarnessInspectSvg } = require('./inspection/inspect-svg') as typeof import('./inspection/inspect-svg')
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

async function handleCaptureBrowserCommand(args: CaptureBrowserArgs) {
  try {
    const { runHarnessCaptureBrowser } = require('./browser/capture-browser') as typeof import('./browser/capture-browser')
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

async function handleSummarizeCaseCommand(args: SummarizeCaseArgs) {
  try {
    const { runHarnessSummarizeCase } = require('./summary/summarize-case') as typeof import('./summary/summarize-case')
    const result = await runHarnessSummarizeCase({
      artifactsDir: args.artifacts,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = statusToExitCode(result.status)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

function parseViewport(input?: string): CaptureViewport | undefined {
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
