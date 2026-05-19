import fs from 'fs'
import path from 'path'
import { deriveSuiteStatus, statusToExitCode } from '../exit-codes'
import { runHarnessSuite } from '../orchestration/run-suite'
import type { RunSuiteSummary } from '../orchestration/run-contracts'
import { captureTraceEnvironment } from './env-capture'
import { captureGitState, writeGitDiffFile } from './git-capture'
import { initializeAgentActivityFiles } from '../activity/activity-writer'
import { writeTraceManifest } from './manifest-writer'
import { runTraceCommand } from './command-runner'
import { buildTraceRunId } from './run-id'
import { writeInitialTraceAnalysis } from './analysis-writer'
import type {
  TraceCommandEntry,
  TraceManifest,
  TraceOutcomeValue,
  TraceRunOptions,
  TraceRunResult,
} from './trace-contracts'

const TASK_FILE = 'task.md'
const DECISIONS_FILE = 'decisions.ndjson'
const ENV_FILE = 'env.json'
const COMMANDS_FILE = 'commands.ndjson'
const MANIFEST_FILE = 'manifest.json'
const ANALYSIS_FILE = 'analysis.md'
const GIT_BEFORE_DIFF = 'git-before.diff'
const GIT_AFTER_DIFF = 'git-after.diff'
const HARNESS_SUMMARY = 'harness/suite.json'

function assertValidTraceRunId(runId: string) {
  const segments = runId.split(/[\\/]+/)
  if (!runId || path.isAbsolute(runId) || path.win32.isAbsolute(runId) || segments.some(segment => segment === '..')) {
    throw new Error(`Invalid trace run id: ${runId}`)
  }
}

function writeJsonFile(outFile: string, value: unknown) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, `${JSON.stringify(value, null, 2)}\n`)
}

function writeCommandsFile(outFile: string, commands: TraceCommandEntry[]) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  const body = commands.map(command => JSON.stringify(command)).join('\n')
  fs.writeFileSync(outFile, body ? `${body}\n` : '')
}

function makeManualCommand(options: {
  cmd: string
  cwd: string
  phase: TraceCommandEntry['phase']
  exitCode: number
  summary: string
  artifactRefs?: string[]
}): TraceCommandEntry {
  return {
    schema_version: 1,
    ts: new Date().toISOString(),
    cmd: options.cmd,
    cwd: options.cwd,
    exit_code: options.exitCode,
    duration_ms: 0,
    phase: options.phase,
    summary: options.summary,
    ...(options.artifactRefs ? { artifact_refs: options.artifactRefs } : {}),
  }
}

function summarizeHarnessSuite(summary: RunSuiteSummary) {
  return `${summary.ok} ok, ${summary.suspicious} suspicious, ${summary.fail} fail`
}

function createManifest(options: {
  opts: TraceRunOptions
  runId: string
  gitBefore: ReturnType<typeof captureGitState>
  gitAfter: ReturnType<typeof captureGitState>
  outcome: TraceManifest['outcome']
  harnessSummary: string | null
  incompleteReason: string | null
}): TraceManifest {
  return {
    schema_version: 1,
    run_id: options.runId,
    created_at: new Date().toISOString(),
    repo: path.basename(options.opts.cwd),
    workspace: options.opts.cwd,
    agent: {
      name: 'codex',
      model: 'gpt-5',
      session_id: null,
    },
    task: {
      title: options.opts.task,
      source: 'user',
      scope: ['packages/pintora-harness'],
    },
    git: {
      branch: options.gitBefore.branch,
      commit_before: options.gitBefore.commit,
      commit_after: options.gitAfter.commit,
      dirty_before: options.gitBefore.dirty,
      dirty_after: options.gitAfter.dirty,
      git_before_diff: GIT_BEFORE_DIFF,
      git_after_diff: GIT_AFTER_DIFF,
    },
    outcome: options.outcome,
    artifacts: {
      task: TASK_FILE,
      env: ENV_FILE,
      commands: COMMANDS_FILE,
      decisions: DECISIONS_FILE,
      harness: options.harnessSummary,
      analysis: ANALYSIS_FILE,
    },
    incomplete_reason: options.incompleteReason,
  }
}

function finalizeTraceRun(options: {
  opts: TraceRunOptions
  runId: string
  runDir: string
  gitBefore: ReturnType<typeof captureGitState>
  outcome: TraceManifest['outcome']
  commands: TraceCommandEntry[]
  harnessSummary: string | null
  incompleteReason: string | null
}) {
  const gitAfter = captureGitState(options.opts.cwd)
  writeGitDiffFile(options.opts.cwd, path.join(options.runDir, GIT_AFTER_DIFF))
  writeCommandsFile(path.join(options.runDir, COMMANDS_FILE), options.commands)

  const manifest = createManifest({
    opts: options.opts,
    runId: options.runId,
    gitBefore: options.gitBefore,
    gitAfter,
    outcome: options.outcome,
    harnessSummary: options.harnessSummary,
    incompleteReason: options.incompleteReason,
  })
  writeTraceManifest(path.join(options.runDir, MANIFEST_FILE), manifest)
  writeInitialTraceAnalysis({
    outFile: path.join(options.runDir, ANALYSIS_FILE),
    manifest,
    commands: options.commands,
  })
}

export async function runHarnessTraceRun(opts: TraceRunOptions): Promise<TraceRunResult> {
  const runId = opts.runId || buildTraceRunId(opts.task)
  assertValidTraceRunId(runId)
  const runDir = path.join(opts.outDir, runId)
  const commands: TraceCommandEntry[] = []
  const outcome: TraceManifest['outcome'] = {
    compile: 'not_run',
    unit_tests: 'not_run',
    harness: 'not_run',
    review: 'not_run',
  }
  let status: TraceRunResult['status'] = 'completed'
  let harnessSummary: string | null = null
  let incompleteReason: string | null = null

  fs.mkdirSync(runDir, { recursive: true })
  initializeAgentActivityFiles(runDir)
  fs.writeFileSync(path.join(runDir, TASK_FILE), `${opts.task}\n`)
  fs.writeFileSync(path.join(runDir, DECISIONS_FILE), '')
  writeJsonFile(path.join(runDir, ENV_FILE), captureTraceEnvironment({ cwd: opts.cwd }))

  const gitBefore = captureGitState(opts.cwd)
  writeGitDiffFile(opts.cwd, path.join(runDir, GIT_BEFORE_DIFF))

  if (opts.skipCompile) {
    outcome.compile = 'skipped'
    commands.push(
      makeManualCommand({
        cmd: 'pnpm compile',
        cwd: opts.cwd,
        phase: 'build',
        exitCode: 0,
        summary: 'skipped by option',
      }),
    )
  } else {
    const compileCommand = await runTraceCommand({
      cwd: opts.cwd,
      cmd: 'pnpm',
      args: ['compile'],
      phase: 'build',
      summary: 'compile',
    })
    commands.push(compileCommand)
    outcome.compile = compileCommand.exit_code === 0 ? 'pass' : 'fail'
  }

  if (outcome.compile === 'fail') {
    status = 'failed'
    incompleteReason = 'compile failed'
    outcome.unit_tests = 'skipped'
    outcome.harness = 'skipped'
    commands.push(
      makeManualCommand({
        cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
        cwd: opts.cwd,
        phase: 'test',
        exitCode: 0,
        summary: 'skipped because compile failed',
      }),
      makeManualCommand({
        cmd: `runHarnessSuite ${opts.suite}`,
        cwd: opts.cwd,
        phase: 'harness',
        exitCode: 0,
        summary: 'skipped because compile failed',
      }),
    )
  }

  if (outcome.compile !== 'fail') {
    if (opts.skipTests) {
      outcome.unit_tests = 'skipped'
      commands.push(
        makeManualCommand({
          cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
          cwd: opts.cwd,
          phase: 'test',
          exitCode: 0,
          summary: 'skipped by option',
        }),
      )
    } else {
      const testCommand = await runTraceCommand({
        cwd: opts.cwd,
        cmd: 'pnpm',
        args: ['--filter', '@pintora/harness', 'test', '--', '--runInBand'],
        phase: 'test',
        summary: 'unit tests',
      })
      commands.push(testCommand)
      outcome.unit_tests = testCommand.exit_code === 0 ? 'pass' : 'fail'
    }

    if (outcome.unit_tests === 'fail') {
      status = 'failed'
      incompleteReason = 'unit tests failed'
      outcome.harness = 'skipped'
      commands.push(
        makeManualCommand({
          cmd: `runHarnessSuite ${opts.suite}`,
          cwd: opts.cwd,
          phase: 'harness',
          exitCode: 0,
          summary: 'skipped because unit tests failed',
        }),
      )
    }
  }

  if (outcome.compile !== 'fail' && outcome.unit_tests !== 'fail') {
    try {
      const suite = await runHarnessSuite({
        cwd: opts.cwd,
        suite: opts.suite,
        artifactsDir: path.join(runDir, 'harness'),
        enableCaptureBrowser: opts.enableCaptureBrowser,
        maxConcurrency: opts.maxConcurrency,
      })
      const suiteStatus = deriveSuiteStatus(suite)
      const summary = summarizeHarnessSuite(suite)
      outcome.harness = suiteStatus as TraceOutcomeValue
      harnessSummary = HARNESS_SUMMARY
      commands.push(
        makeManualCommand({
          cmd: `runHarnessSuite ${opts.suite}`,
          cwd: opts.cwd,
          phase: 'harness',
          exitCode: statusToExitCode(suiteStatus),
          summary,
          artifactRefs: [HARNESS_SUMMARY],
        }),
      )
    } catch (error) {
      status = 'failed'
      incompleteReason = error instanceof Error ? error.message : 'harness failed to start'
      outcome.harness = 'failed_to_start'
      commands.push(
        makeManualCommand({
          cmd: `runHarnessSuite ${opts.suite}`,
          cwd: opts.cwd,
          phase: 'harness',
          exitCode: -1,
          summary: 'failed_to_start',
        }),
      )
    }
  }

  finalizeTraceRun({
    opts,
    runId,
    runDir,
    gitBefore,
    outcome,
    commands,
    harnessSummary,
    incompleteReason,
  })

  return {
    status,
    runId,
    runDir,
    manifest: MANIFEST_FILE,
    harnessSummary,
  }
}
