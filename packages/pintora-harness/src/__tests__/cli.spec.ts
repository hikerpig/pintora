describe('pintora-harness cli shell', () => {
  const originalArgv = process.argv.slice()
  const originalExitCode = process.exitCode
  const originalStdoutWrite = process.stdout.write

  beforeEach(() => {
    jest.resetModules()
    process.argv = ['node', 'pintora-harness', '--help']
    process.exitCode = undefined
    process.stdout.write = jest.fn(() => true) as typeof process.stdout.write
  })

  afterEach(() => {
    process.argv = originalArgv.slice()
    process.exitCode = originalExitCode
    process.stdout.write = originalStdoutWrite
    jest.restoreAllMocks()
  })

  it('boots the harness cli without importing @pintora/cli', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    jest.mock('@pintora/cli', () => {
      throw new Error('@pintora/cli must not be imported')
    })

    expect(() => {
      jest.isolateModules(() => {
        require('../cli')
      })
    }).not.toThrow()

    expect(consoleSpy).toHaveBeenCalled()
  })

  it('dispatches review-case to the review runner', async () => {
    const mockRunHarnessReviewCase = jest.fn(async () => ({
      adapter: 'manual-review-pack',
      status: 'completed',
      verdict: 'needs_human_review',
      review: 'review.json',
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'review-case',
      '--artifacts',
      '/tmp/harness-case',
      '--adapter',
      'manual-review-pack',
      '--out',
      '/tmp/harness-case/review.json',
      '--pack-dir',
      '/tmp/harness-case/review-pack-custom',
    ]

    jest.mock('../review/review-case', () => ({
      runHarnessReviewCase: mockRunHarnessReviewCase,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessReviewCase).toHaveBeenCalledWith({
      cwd: process.cwd(),
      artifactsDir: '/tmp/harness-case',
      adapter: 'manual-review-pack',
      outFile: '/tmp/harness-case/review.json',
      packDir: '/tmp/harness-case/review-pack-custom',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches apply-review to the ingestion runner', async () => {
    const mockRunHarnessApplyReview = jest.fn(async () => ({
      status: 'completed',
      review_status: 'consumed',
      decision: 'review-decision.json',
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'apply-review',
      '--artifacts',
      '/tmp/harness-case',
      '--review',
      '/tmp/harness-case/review.json',
      '--out',
      '/tmp/harness-case/review-decision.json',
    ]

    jest.mock('../review/apply-review', () => ({
      runHarnessApplyReview: mockRunHarnessApplyReview,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessApplyReview).toHaveBeenCalledWith({
      artifactsDir: '/tmp/harness-case',
      reviewFile: '/tmp/harness-case/review.json',
      outFile: '/tmp/harness-case/review-decision.json',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches trace-run to the trace runner', async () => {
    const mockRunHarnessTraceRun = jest.fn(async () => ({
      status: 'completed',
      runId: '20260517-105200-manual-smoke-trace',
      runDir: '/tmp/agent-runs/20260517-105200-manual-smoke-trace',
      manifest: 'manifest.json',
      harnessSummary: null,
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'trace-run',
      '--task',
      'Manual smoke trace',
      '--suite',
      'smoke',
      '--out',
      '/tmp/agent-runs',
      '--run-id',
      '20260517-105200-manual-smoke-trace',
      '--no-compile',
      '--no-tests',
      '--no-capture-browser',
      '--max-concurrency',
      '1',
    ]

    jest.mock('../trace/trace-run', () => ({
      runHarnessTraceRun: mockRunHarnessTraceRun,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessTraceRun).toHaveBeenCalledWith({
      cwd: process.cwd(),
      task: 'Manual smoke trace',
      suite: 'smoke',
      outDir: '/tmp/agent-runs',
      runId: '20260517-105200-manual-smoke-trace',
      skipCompile: true,
      skipTests: true,
      enableCaptureBrowser: false,
      maxConcurrency: 1,
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches trace-agent-event to the activity event runner', async () => {
    const mockRunHarnessTraceAgentEvent = jest.fn(async () => ({
      status: 'completed',
      event: 'agent-events.ndjson',
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'trace-agent-event',
      '--run',
      '/tmp/agent-runs/run-one',
      '--kind',
      'constraint_check',
      '--phase',
      'context',
      '--summary',
      'Read package AGENTS.md before editing harness package.',
      '--data',
      '{"constraint_id":"package-agents-before-edit","status":"observed"}',
    ]

    jest.mock('../activity/activity-writer', () => ({
      runHarnessTraceAgentEvent: mockRunHarnessTraceAgentEvent,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessTraceAgentEvent).toHaveBeenCalledWith({
      runDir: '/tmp/agent-runs/run-one',
      kind: 'constraint_check',
      phase: 'context',
      summary: 'Read package AGENTS.md before editing harness package.',
      data: {
        constraint_id: 'package-agents-before-edit',
        status: 'observed',
      },
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches summarize-agent-run to the activity summary runner', async () => {
    const mockRunHarnessSummarizeAgentRun = jest.fn(async () => ({
      status: 'completed',
      summary: 'agent-summary.md',
      gaps: 'constraint-gaps.md',
    }))

    process.argv = ['node', 'pintora-harness', 'summarize-agent-run', '--run', '/tmp/agent-runs/run-one']

    jest.mock('../activity/summarize-agent-run', () => ({
      runHarnessSummarizeAgentRun: mockRunHarnessSummarizeAgentRun,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessSummarizeAgentRun).toHaveBeenCalledWith({
      runDir: '/tmp/agent-runs/run-one',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches analyze-agent-runs to the activity analysis runner', async () => {
    const mockRunHarnessAnalyzeAgentRuns = jest.fn(async () => ({
      status: 'completed',
      report: 'agent-observability-report.json',
      totalRuns: 2,
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'analyze-agent-runs',
      '--runs',
      '/tmp/agent-runs',
      '--out',
      '/tmp/agent-observability-report.json',
    ]

    jest.mock('../activity/analyze-agent-runs', () => ({
      runHarnessAnalyzeAgentRuns: mockRunHarnessAnalyzeAgentRuns,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessAnalyzeAgentRuns).toHaveBeenCalledWith({
      runsDir: '/tmp/agent-runs',
      outFile: '/tmp/agent-observability-report.json',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches analyze-runs to the analysis runner', async () => {
    const mockRunHarnessAnalyzeRuns = jest.fn(async () => ({
      status: 'completed',
      report: 'observability-report.json',
      totalRuns: 2,
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'analyze-runs',
      '--runs',
      '/tmp/agent-runs',
      '--out',
      '/tmp/observability-report.json',
    ]

    jest.mock('../analysis/analyze-runs', () => ({
      runHarnessAnalyzeRuns: mockRunHarnessAnalyzeRuns,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessAnalyzeRuns).toHaveBeenCalledWith({
      runsDir: '/tmp/agent-runs',
      outFile: '/tmp/observability-report.json',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches compare-runs to the comparison runner', async () => {
    const mockRunHarnessCompareRuns = jest.fn(async () => ({
      schema_version: 1,
      generated_at: '2026-05-18T10:00:00.000Z',
      base: 'base-run',
      head: 'head-run',
      improved: [],
      regressed: [],
      unchanged: [],
      missing: [],
      finding_changes: [],
      command_changes: [],
      prediction_results: [],
      prediction_quality: {
        confirmed: 0,
        partially_confirmed: 0,
        disconfirmed: 0,
        inconclusive: 0,
        pending: 0,
      },
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'compare-runs',
      '--base',
      '/tmp/agent-runs/base-run',
      '--head',
      '/tmp/agent-runs/head-run',
    ]

    jest.mock('../analysis/compare-runs', () => ({
      runHarnessCompareRuns: mockRunHarnessCompareRuns,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessCompareRuns).toHaveBeenCalledWith({
      baseRunDir: '/tmp/agent-runs/base-run',
      headRunDir: '/tmp/agent-runs/head-run',
    })
    expect(process.exitCode).toBe(0)
  })

  it('dispatches brief-run to the brief runner', async () => {
    const mockRunHarnessBriefRun = jest.fn(async () => ({
      status: 'completed',
      brief: 'repair-brief.md',
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'brief-run',
      '--run',
      '/tmp/agent-runs/run-one',
      '--out',
      '/tmp/agent-runs/run-one/repair-brief.md',
    ]

    jest.mock('../analysis/brief-run', () => ({
      runHarnessBriefRun: mockRunHarnessBriefRun,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessBriefRun).toHaveBeenCalledWith({
      runDir: '/tmp/agent-runs/run-one',
      outFile: '/tmp/agent-runs/run-one/repair-brief.md',
    })
    expect(process.exitCode).toBe(0)
  })
})
