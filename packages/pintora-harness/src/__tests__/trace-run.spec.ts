import fs from 'fs'
import os from 'os'
import path from 'path'
import { runHarnessTraceRun } from '../trace/trace-run'
import { runTraceCommand } from '../trace/command-runner'
import { runHarnessSuite } from '../orchestration/run-suite'

jest.mock('../trace/command-runner')
jest.mock('../orchestration/run-suite')

const mockedRunTraceCommand = jest.mocked(runTraceCommand)
const mockedRunHarnessSuite = jest.mocked(runHarnessSuite)

type TestCommandEntry = {
  schema_version: 1
  ts: string
  cmd: string
  cwd: string
  exit_code: number
  duration_ms: number
  phase: 'build' | 'test' | 'harness'
  summary: string
  stderr_excerpt?: string
}

type TestSuiteSummary = {
  suite: string
  total: number
  ok: number
  suspicious: number
  fail: number
  captureBrowserTriggeredCount: number
  accepted: number
  needsRepair: number
  needsRerun: number
  escalated: number
  reviewPending: number
  cases: {
    caseId: string
    status: 'ok' | 'suspicious' | 'fail'
    summary: string
    captureBrowserTriggered: boolean
  }[]
}

function makeCommand(overrides: Partial<TestCommandEntry> = {}): TestCommandEntry {
  return {
    schema_version: 1,
    ts: '2026-05-17T10:52:00.000Z',
    cmd: 'pnpm compile',
    cwd: process.cwd(),
    exit_code: 0,
    duration_ms: 12,
    phase: 'build',
    summary: 'compile',
    ...overrides,
  }
}

function makeSuite(overrides: Partial<TestSuiteSummary> = {}): TestSuiteSummary {
  return {
    suite: 'smoke',
    total: 2,
    ok: 2,
    suspicious: 0,
    fail: 0,
    captureBrowserTriggeredCount: 0,
    accepted: 0,
    needsRepair: 0,
    needsRerun: 0,
    escalated: 0,
    reviewPending: 0,
    cases: [],
    ...overrides,
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

function readCommands(runDir: string) {
  return fs
    .readFileSync(path.join(runDir, 'commands.ndjson'), 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line))
}

function expectFinalTraceFiles(runDir: string) {
  expect(fs.existsSync(path.join(runDir, 'commands.ndjson'))).toBe(true)
  expect(fs.existsSync(path.join(runDir, 'git-after.diff'))).toBe(true)
  expect(fs.existsSync(path.join(runDir, 'manifest.json'))).toBe(true)
  expect(fs.existsSync(path.join(runDir, 'analysis.md'))).toBe(true)
}

describe('runHarnessTraceRun', () => {
  beforeEach(() => {
    mockedRunTraceCommand.mockReset()
    mockedRunHarnessSuite.mockReset()
  })

  it('writes trace files for a successful compile, unit test, and harness run', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    mockedRunTraceCommand
      .mockResolvedValueOnce(makeCommand({ cmd: 'pnpm compile', phase: 'build', summary: 'compile', exit_code: 0 }))
      .mockResolvedValueOnce(
        makeCommand({
          cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
          phase: 'test',
          summary: 'unit tests',
          exit_code: 0,
        }),
      )
    mockedRunHarnessSuite.mockResolvedValueOnce(makeSuite())

    const result = await runHarnessTraceRun({
      cwd: process.cwd(),
      task: 'Trace orchestration',
      suite: 'smoke',
      outDir,
      runId: 'run-success',
      enableCaptureBrowser: true,
      maxConcurrency: 2,
    })

    const runDir = path.join(outDir, 'run-success')
    expect(result).toEqual({
      status: 'completed',
      runId: 'run-success',
      runDir,
      manifest: 'manifest.json',
      harnessSummary: 'harness/suite.json',
    })
    expect(fs.existsSync(path.join(runDir, 'task.md'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'env.json'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'decisions.ndjson'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'commands.ndjson'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'analysis.md'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'agent-events.ndjson'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'constraints.json'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'agent-summary.md'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'constraint-gaps.md'))).toBe(true)
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'constraints.json'), 'utf8'))).toEqual({
      schema_version: 1,
      constraints: [],
    })

    const manifest = readJson<any>(path.join(runDir, 'manifest.json'))
    expect(manifest.run_id).toBe('run-success')
    expect(manifest.task.title).toBe('Trace orchestration')
    expect(manifest.outcome).toMatchObject({
      compile: 'pass',
      unit_tests: 'pass',
      harness: 'ok',
      review: 'not_run',
    })
    expect(manifest.artifacts).toMatchObject({
      task: 'task.md',
      env: 'env.json',
      commands: 'commands.ndjson',
      decisions: 'decisions.ndjson',
      harness: 'harness/suite.json',
      analysis: 'analysis.md',
    })

    const commands = readCommands(runDir)
    expect(commands).toHaveLength(3)
    expect(commands.map(command => command.phase)).toEqual(['build', 'test', 'harness'])
    expect(commands[0]).toMatchObject({ cmd: 'pnpm compile', exit_code: 0 })
    expect(commands[1]).toMatchObject({ cmd: 'pnpm --filter @pintora/harness test -- --runInBand', exit_code: 0 })
    expect(commands[2]).toMatchObject({
      cmd: 'runHarnessSuite smoke',
      phase: 'harness',
      exit_code: 0,
      summary: '2 ok, 0 suspicious, 0 fail',
      artifact_refs: ['harness/suite.json'],
    })

    const analysis = fs.readFileSync(path.join(runDir, 'analysis.md'), 'utf8')
    expect(analysis).toContain('# Trace Analysis: run-success')
    expect(analysis).toContain('Task: Trace orchestration')
    expect(analysis).toContain('compile: pass')
    expect(analysis).toContain('unit_tests: pass')
    expect(analysis).toContain('harness: ok')
    expect(mockedRunHarnessSuite).toHaveBeenCalledWith({
      cwd: process.cwd(),
      suite: 'smoke',
      artifactsDir: path.join(runDir, 'harness'),
      enableCaptureBrowser: true,
      maxConcurrency: 2,
    })
  })

  it('writes final trace files and skips later gates when compile fails', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    mockedRunTraceCommand.mockResolvedValueOnce(
      makeCommand({
        cmd: 'pnpm compile',
        phase: 'build',
        summary: 'compile',
        exit_code: 1,
        stderr_excerpt: 'compile failed',
      }),
    )

    const result = await runHarnessTraceRun({
      cwd: process.cwd(),
      task: 'Trace compile failure',
      suite: 'smoke',
      outDir,
      runId: 'run-compile-fail',
      enableCaptureBrowser: false,
      maxConcurrency: 1,
    })

    const runDir = path.join(outDir, 'run-compile-fail')
    expect(result.status).toBe('failed')
    expect(result.harnessSummary).toBeNull()
    expect(fs.existsSync(path.join(runDir, 'manifest.json'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'commands.ndjson'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'analysis.md'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'agent-events.ndjson'))).toBe(true)
    expect(fs.existsSync(path.join(runDir, 'constraints.json'))).toBe(true)
    expect(mockedRunHarnessSuite).not.toHaveBeenCalled()

    const manifest = readJson<any>(path.join(runDir, 'manifest.json'))
    expect(manifest.outcome).toMatchObject({
      compile: 'fail',
      unit_tests: 'skipped',
      harness: 'skipped',
      review: 'not_run',
    })
    expect(manifest.incomplete_reason).toBe('compile failed')

    const commands = readCommands(runDir)
    expect(commands).toHaveLength(3)
    expect(commands[0]).toMatchObject({ phase: 'build', exit_code: 1 })
    expect(commands[1]).toMatchObject({ phase: 'test', summary: 'skipped because compile failed', exit_code: 0 })
    expect(commands[2]).toMatchObject({ phase: 'harness', summary: 'skipped because compile failed', exit_code: 0 })
  })

  it('rejects an explicit run id that escapes the output directory before writing artifacts', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    const escapedDir = path.join(outDir, 'escaped')

    await expect(
      runHarnessTraceRun({
        cwd: process.cwd(),
        task: 'Trace invalid run id',
        suite: 'smoke',
        outDir,
        runId: '../escaped',
        enableCaptureBrowser: false,
        maxConcurrency: 1,
      }),
    ).rejects.toThrow('Invalid trace run id')

    expect(fs.existsSync(escapedDir)).toBe(false)
    expect(fs.readdirSync(outDir)).toEqual([])
    expect(mockedRunTraceCommand).not.toHaveBeenCalled()
    expect(mockedRunHarnessSuite).not.toHaveBeenCalled()
  })

  it('writes final trace files and skips harness when unit tests fail', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    mockedRunTraceCommand
      .mockResolvedValueOnce(makeCommand({ cmd: 'pnpm compile', phase: 'build', summary: 'compile', exit_code: 0 }))
      .mockResolvedValueOnce(
        makeCommand({
          cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
          phase: 'test',
          summary: 'unit tests',
          exit_code: 1,
          stderr_excerpt: 'unit tests failed',
        }),
      )

    const result = await runHarnessTraceRun({
      cwd: process.cwd(),
      task: 'Trace unit failure',
      suite: 'smoke',
      outDir,
      runId: 'run-unit-fail',
      enableCaptureBrowser: false,
      maxConcurrency: 1,
    })

    const runDir = path.join(outDir, 'run-unit-fail')
    expect(result.status).toBe('failed')
    expect(result.harnessSummary).toBeNull()
    expectFinalTraceFiles(runDir)
    expect(mockedRunHarnessSuite).not.toHaveBeenCalled()

    const manifest = readJson<any>(path.join(runDir, 'manifest.json'))
    expect(manifest.outcome).toMatchObject({
      compile: 'pass',
      unit_tests: 'fail',
      harness: 'skipped',
      review: 'not_run',
    })
    expect(manifest.incomplete_reason).toBe('unit tests failed')

    const commands = readCommands(runDir)
    expect(commands).toHaveLength(3)
    expect(commands[1]).toMatchObject({ phase: 'test', exit_code: 1 })
    expect(commands[2]).toMatchObject({ phase: 'harness', summary: 'skipped because unit tests failed', exit_code: 0 })
  })

  it('writes final trace files when the harness fails to start', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    mockedRunTraceCommand
      .mockResolvedValueOnce(makeCommand({ cmd: 'pnpm compile', phase: 'build', summary: 'compile', exit_code: 0 }))
      .mockResolvedValueOnce(
        makeCommand({
          cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
          phase: 'test',
          summary: 'unit tests',
          exit_code: 0,
        }),
      )
    mockedRunHarnessSuite.mockRejectedValueOnce(new Error('suite unavailable'))

    const result = await runHarnessTraceRun({
      cwd: process.cwd(),
      task: 'Trace harness start failure',
      suite: 'smoke',
      outDir,
      runId: 'run-harness-throw',
      enableCaptureBrowser: false,
      maxConcurrency: 1,
    })

    const runDir = path.join(outDir, 'run-harness-throw')
    expect(result.status).toBe('failed')
    expect(result.harnessSummary).toBeNull()
    expectFinalTraceFiles(runDir)

    const manifest = readJson<any>(path.join(runDir, 'manifest.json'))
    expect(manifest.outcome).toMatchObject({
      compile: 'pass',
      unit_tests: 'pass',
      harness: 'failed_to_start',
      review: 'not_run',
    })
    expect(manifest.incomplete_reason).toBe('suite unavailable')

    const commands = readCommands(runDir)
    expect(commands).toHaveLength(3)
    expect(commands[2]).toMatchObject({ phase: 'harness', exit_code: -1, summary: 'failed_to_start' })
  })

  it('keeps the trace run completed when the collected harness suite is suspicious or failed', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-run-'))
    mockedRunTraceCommand
      .mockResolvedValueOnce(makeCommand({ cmd: 'pnpm compile', phase: 'build', summary: 'compile', exit_code: 0 }))
      .mockResolvedValueOnce(
        makeCommand({
          cmd: 'pnpm --filter @pintora/harness test -- --runInBand',
          phase: 'test',
          summary: 'unit tests',
          exit_code: 0,
        }),
      )
    mockedRunHarnessSuite.mockResolvedValueOnce(makeSuite({ ok: 1, suspicious: 0, fail: 1 }))

    const result = await runHarnessTraceRun({
      cwd: process.cwd(),
      task: 'Trace harness fail outcome',
      suite: 'smoke',
      outDir,
      runId: 'run-harness-fail',
      enableCaptureBrowser: false,
      maxConcurrency: 1,
    })

    const runDir = path.join(outDir, 'run-harness-fail')
    expect(result.status).toBe('completed')
    expect(result.harnessSummary).toBe('harness/suite.json')

    const manifest = readJson<any>(path.join(runDir, 'manifest.json'))
    expect(manifest.outcome.harness).toBe('fail')
    expect(manifest.incomplete_reason).toBeNull()

    const commands = readCommands(runDir)
    expect(commands[2]).toMatchObject({
      phase: 'harness',
      exit_code: 20,
      summary: '1 ok, 0 suspicious, 1 fail',
    })
  })
})
