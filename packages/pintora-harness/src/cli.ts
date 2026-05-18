import consola from 'consola'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { deriveSuiteStatus, statusToExitCode } from './exit-codes'
import type { CaptureViewport } from './contracts/browser'
import type { HarnessReviewAdapterName } from './review/review-contracts'
import type { RunSuiteOptions } from './orchestration/run-contracts'

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

type ReviewCaseArgs = {
  artifacts: string
  adapter: HarnessReviewAdapterName
  out: string
  'pack-dir'?: string
}

type ApplyReviewArgs = {
  artifacts: string
  review: string
  out: string
}

type RunCaseArgs = {
  case?: string
  input?: string
  'artifacts-dir': string
  'base-url'?: string
  viewport?: string
  'no-capture-browser'?: boolean
}

type RunSuiteArgs = {
  suite: RunSuiteOptions['suite']
  'artifacts-dir': string
  'base-url'?: string
  viewport?: string
  'no-capture-browser'?: boolean
  'max-concurrency'?: number
}

type TraceRunArgs = {
  task: string
  suite: RunSuiteOptions['suite']
  out: string
  'run-id'?: string
  'no-compile'?: boolean
  compile?: boolean
  'no-tests'?: boolean
  tests?: boolean
  'no-capture-browser'?: boolean
  captureBrowser?: boolean
  'capture-browser'?: boolean
  'max-concurrency'?: number
}

type AnalyzeRunsArgs = {
  runs: string
  out: string
}

type CompareRunsArgs = {
  base: string
  head: string
}

type BriefRunArgs = {
  run: string
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
  .command<ReviewCaseArgs>({
    command: 'review-case',
    describe: 'Run the downstream review adapter against existing harness artifacts',
    builder: {
      artifacts: { describe: 'Harness artifacts directory', type: 'string', demandOption: true },
      adapter: { describe: 'Review adapter name', type: 'string', demandOption: true },
      out: { describe: 'Output review file path', type: 'string', demandOption: true },
      'pack-dir': { describe: 'Review pack output directory', type: 'string' },
    },
    handler: handleReviewCaseCommand,
  })
  .command<ApplyReviewArgs>({
    command: 'apply-review',
    describe: 'Consume summary.json + review.json and emit review-decision.json',
    builder: {
      artifacts: { describe: 'Harness artifacts directory', type: 'string', demandOption: true },
      review: { describe: 'Input review.json path', type: 'string', demandOption: true },
      out: { describe: 'Output decision file path', type: 'string', demandOption: true },
    },
    handler: handleApplyReviewCommand,
  })
  .command<RunCaseArgs>({
    command: 'run-case',
    describe: 'Run the full harness pipeline for one case or input',
    builder: {
      case: { describe: 'Harness case id', type: 'string' },
      input: { describe: 'Input file path', type: 'string' },
      'artifacts-dir': { describe: 'Target artifact directory', type: 'string', demandOption: true },
      'base-url': { describe: 'Preview base URL', type: 'string' },
      viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
      'no-capture-browser': { describe: 'Disable automatic browser escalation', type: 'boolean', default: false },
    },
    handler: handleRunCaseCommand,
  })
  .command<RunSuiteArgs>({
    command: 'run-suite',
    describe: 'Run the harness pipeline for a predefined suite of cases',
    builder: {
      suite: { describe: 'Harness suite name', type: 'string', demandOption: true },
      'artifacts-dir': { describe: 'Target suite artifact directory', type: 'string', demandOption: true },
      'base-url': { describe: 'Preview base URL', type: 'string' },
      viewport: { describe: 'Viewport formatted as WIDTHxHEIGHT', type: 'string' },
      'no-capture-browser': { describe: 'Disable automatic browser escalation', type: 'boolean', default: false },
      'max-concurrency': { describe: 'Maximum parallel cases', type: 'number', default: 1 },
    },
    handler: handleRunSuiteCommand,
  })
  .command<TraceRunArgs>({
    command: 'trace-run',
    describe: 'Run the agent trace harness workflow',
    builder: {
      task: { describe: 'Task title to trace', type: 'string', demandOption: true },
      suite: { describe: 'Harness suite name', type: 'string', default: 'smoke' },
      out: { describe: 'Trace run output directory', type: 'string', default: 'artifacts/agent-runs' },
      'run-id': { describe: 'Trace run id', type: 'string' },
      'no-compile': { describe: 'Skip pnpm compile', type: 'boolean', default: false },
      'no-tests': { describe: 'Skip harness unit tests', type: 'boolean', default: false },
      'no-capture-browser': { describe: 'Disable automatic browser escalation', type: 'boolean', default: false },
      'max-concurrency': { describe: 'Maximum parallel harness cases', type: 'number', default: 1 },
    },
    handler: handleTraceRunCommand,
  })
  .command<AnalyzeRunsArgs>({
    command: 'analyze-runs',
    describe: 'Analyze agent trace runs and emit an observability report',
    builder: {
      runs: { describe: 'Agent trace runs directory', type: 'string', demandOption: true },
      out: { describe: 'Output report JSON file', type: 'string', demandOption: true },
    },
    handler: handleAnalyzeRunsCommand,
  })
  .command<CompareRunsArgs>({
    command: 'compare-runs',
    describe: 'Compare two agent trace runs',
    builder: {
      base: { describe: 'Base trace run directory', type: 'string', demandOption: true },
      head: { describe: 'Head trace run directory', type: 'string', demandOption: true },
    },
    handler: handleCompareRunsCommand,
  })
  .command<BriefRunArgs>({
    command: 'brief-run',
    describe: 'Write a human-readable repair brief for one trace run',
    builder: {
      run: { describe: 'Agent trace run directory', type: 'string', demandOption: true },
      out: { describe: 'Output markdown brief file', type: 'string', demandOption: true },
    },
    handler: handleBriefRunCommand,
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
    const { runHarnessRenderSvg } = await import('./rendering/render-svg')
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
    const { runHarnessInspectSvg } = await import('./inspection/inspect-svg')
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
    const { runHarnessCaptureBrowser } = await import('./browser/capture-browser')
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
    const { runHarnessSummarizeCase } = await import('./summary/summarize-case')
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

async function handleReviewCaseCommand(args: ReviewCaseArgs) {
  try {
    const { runHarnessReviewCase } = require('./review/review-case') as typeof import('./review/review-case')
    const result = await runHarnessReviewCase({
      cwd: CWD,
      artifactsDir: args.artifacts,
      adapter: args.adapter,
      outFile: args.out,
      packDir: args['pack-dir'],
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'completed' ? 0 : 1
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleApplyReviewCommand(args: ApplyReviewArgs) {
  try {
    const { runHarnessApplyReview } = require('./review/apply-review') as typeof import('./review/apply-review')
    const result = await runHarnessApplyReview({
      artifactsDir: args.artifacts,
      reviewFile: args.review,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'completed' ? 0 : 1
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleRunCaseCommand(args: RunCaseArgs) {
  try {
    const { runHarnessCase } = await import('./orchestration/run-case')
    const result = await runHarnessCase({
      cwd: CWD,
      caseId: args.case,
      inputFile: args.input,
      artifactsDir: args['artifacts-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
      enableCaptureBrowser: !args['no-capture-browser'],
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = statusToExitCode(result.status)
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleRunSuiteCommand(args: RunSuiteArgs) {
  try {
    const { runHarnessSuite } = await import('./orchestration/run-suite')
    const result = await runHarnessSuite({
      cwd: CWD,
      suite: args.suite,
      artifactsDir: args['artifacts-dir'],
      baseUrl: args['base-url'],
      viewport: parseViewport(args.viewport),
      enableCaptureBrowser: !args['no-capture-browser'],
      maxConcurrency: args['max-concurrency'] || 1,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = statusToExitCode(deriveSuiteStatus(result))
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleTraceRunCommand(args: TraceRunArgs) {
  try {
    const { runHarnessTraceRun } = require('./trace/trace-run') as typeof import('./trace/trace-run')
    const result = await runHarnessTraceRun({
      cwd: CWD,
      task: args.task,
      suite: args.suite,
      outDir: args.out,
      runId: args['run-id'],
      skipCompile: args.compile === false || !!args['no-compile'],
      skipTests: args.tests === false || !!args['no-tests'],
      enableCaptureBrowser: !(
        args.captureBrowser === false ||
        args['capture-browser'] === false ||
        args['no-capture-browser']
      ),
      maxConcurrency: args['max-concurrency'] || 1,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'completed' ? 0 : 1
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleAnalyzeRunsCommand(args: AnalyzeRunsArgs) {
  try {
    const { runHarnessAnalyzeRuns } = require('./analysis/analyze-runs') as typeof import('./analysis/analyze-runs')
    const result = await runHarnessAnalyzeRuns({
      runsDir: args.runs,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'completed' ? 0 : 1
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleCompareRunsCommand(args: CompareRunsArgs) {
  try {
    const { runHarnessCompareRuns } = require('./analysis/compare-runs') as typeof import('./analysis/compare-runs')
    const result = await runHarnessCompareRuns({
      baseRunDir: args.base,
      headRunDir: args.head,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = 0
  } catch (error) {
    consola.error(error)
    process.exitCode = 1
  }
}

async function handleBriefRunCommand(args: BriefRunArgs) {
  try {
    const { runHarnessBriefRun } = require('./analysis/brief-run') as typeof import('./analysis/brief-run')
    const result = await runHarnessBriefRun({
      runDir: args.run,
      outFile: args.out,
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    process.exitCode = result.status === 'completed' ? 0 : 1
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
