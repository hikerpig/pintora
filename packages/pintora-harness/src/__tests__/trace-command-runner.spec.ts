import { runTraceCommand } from '../trace/command-runner'
import type {
  TraceCommandEntry,
  TraceCommandPhase,
  TraceManifest,
  TraceOutcomeValue,
  TraceRunOptions,
  TraceRunResult,
} from '../trace/trace-contracts'

const contractOutcomeValues: TraceOutcomeValue[] = [
  'pass',
  'fail',
  'skipped',
  'not_run',
  'failed_to_start',
  'ok',
  'suspicious',
  'needs_review',
  'needs_repair',
  'unknown',
]

const contractCommandPhases: TraceCommandPhase[] = ['build', 'test', 'harness']

const contractCommandEntry: TraceCommandEntry = {
  schema_version: 1,
  ts: '2026-05-17T10:52:00.000Z',
  cmd: 'pnpm test',
  cwd: '/repo',
  exit_code: 0,
  duration_ms: 12,
  phase: 'test',
  summary: 'unit tests',
  stdout_excerpt: 'ok',
  stderr_excerpt: '',
  artifact_refs: ['commands/unit-test.log'],
}

const contractManifest: TraceManifest = {
  schema_version: 1,
  run_id: '20260517-105200-task',
  created_at: '2026-05-17T10:52:00.000Z',
  repo: 'pintora',
  workspace: '/repo',
  agent: {
    name: 'codex',
    model: 'gpt-5',
    session_id: null,
  },
  task: {
    title: 'Improve ER label lane spacing',
    source: 'user',
    scope: ['packages/pintora-harness'],
  },
  git: {
    branch: 'main',
    commit_before: 'a'.repeat(40),
    commit_after: 'b'.repeat(40),
    dirty_before: false,
    dirty_after: true,
    git_before_diff: 'git-before.diff',
    git_after_diff: 'git-after.diff',
  },
  outcome: {
    compile: 'pass',
    unit_tests: 'pass',
    harness: 'not_run',
    review: 'unknown',
  },
  artifacts: {
    task: 'task.md',
    env: 'env.json',
    commands: 'commands.jsonl',
    decisions: 'decisions.json',
    harness: 'harness.json',
    analysis: 'analysis.md',
  },
  incomplete_reason: null,
}

const contractRunOptions: TraceRunOptions = {
  cwd: '/repo',
  task: 'Improve ER label lane spacing',
  suite: 'smoke',
  outDir: '/repo/.pintora/trace',
  runId: 'run-1',
  skipCompile: false,
  skipTests: false,
  enableCaptureBrowser: true,
  maxConcurrency: 2,
}

const contractRunResult: TraceRunResult = {
  status: 'completed',
  runId: 'run-1',
  runDir: '/repo/.pintora/trace/run-1',
  manifest: 'manifest.json',
  harnessSummary: 'harness-summary.json',
}

describe('runTraceCommand', () => {
  it('keeps trace contract shapes compileable', () => {
    expect(contractOutcomeValues).toHaveLength(10)
    expect(contractCommandPhases).toEqual(['build', 'test', 'harness'])
    expect(contractCommandEntry.schema_version).toBe(1)
    expect(contractManifest.agent.session_id).toBeNull()
    expect(contractRunOptions.suite).toBe('smoke')
    expect(contractRunResult.manifest).toBe('manifest.json')
    expect(contractRunResult.harnessSummary).toBe('harness-summary.json')
    expect(contractRunResult.status).toBe('completed')
  })

  it('captures a successful command as a trace entry', async () => {
    const entry = await runTraceCommand({
      cwd: process.cwd(),
      cmd: process.execPath,
      args: ['-e', 'process.stdout.write("hello")'],
      phase: 'test',
      summary: 'print hello',
    })

    expect(entry).toEqual({
      schema_version: 1,
      ts: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      cmd: `${process.execPath} -e process.stdout.write("hello")`,
      cwd: process.cwd(),
      exit_code: 0,
      duration_ms: expect.any(Number),
      phase: 'test',
      summary: 'print hello',
      stdout_excerpt: 'hello',
    })
    expect(entry.summary).toBe('print hello')
    expect(entry.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('does not throw on nonzero exit and bounds output excerpts', async () => {
    const entry = await runTraceCommand({
      cwd: process.cwd(),
      cmd: process.execPath,
      args: ['-e', 'process.stdout.write("abcdef"); process.stderr.write("uvwxyz"); process.exit(7)'],
      phase: 'test',
      summary: 'nonzero',
      maxExcerptLength: 4,
    })

    expect(entry.exit_code).toBe(7)
    expect(entry.stdout_excerpt).toBe('cdef')
    expect(entry.stderr_excerpt).toBe('wxyz')
  })

  it('does not throw when the command cannot be spawned', async () => {
    const entry = await runTraceCommand({
      cwd: process.cwd(),
      cmd: 'pintora-harness-missing-command-for-trace-test',
      phase: 'test',
      summary: 'missing command',
    })

    expect(entry.exit_code).toBe(-1)
    expect(entry.stderr_excerpt).toContain('pintora-harness-missing-command-for-trace-test')
  })
})
