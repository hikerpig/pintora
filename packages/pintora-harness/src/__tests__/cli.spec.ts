/* eslint-disable @typescript-eslint/no-require-imports */
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

  it('dispatches render-ascii to the ascii renderer', async () => {
    const mockRunHarnessRenderAscii = jest.fn(async () => ({
      status: 'ok',
      diagramType: 'er',
      artifacts: ['render.txt', 'plan.json'],
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'render-ascii',
      '--case',
      'er.relationship-spacing-01',
      '--out-dir',
      '/tmp/ascii',
    ]

    jest.mock('../rendering/render-ascii', () => ({
      runHarnessRenderAscii: mockRunHarnessRenderAscii,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessRenderAscii).toHaveBeenCalledWith({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      inputFile: undefined,
      outDir: '/tmp/ascii',
    })
    expect(process.exitCode).toBeUndefined()
  })

  it('dispatches inspect-ascii to the ascii inspector', async () => {
    const mockRunHarnessInspectAscii = jest.fn(async () => ({
      status: 'suspicious',
      findingCount: 1,
      artifacts: ['ascii-metrics.json', 'ascii-findings.json'],
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'inspect-ascii',
      '--in',
      '/tmp/ascii/render.txt',
      '--plan',
      '/tmp/ascii/plan.json',
      '--out-dir',
      '/tmp/ascii',
    ]

    jest.mock('../inspection/inspect-ascii', () => ({
      runHarnessInspectAscii: mockRunHarnessInspectAscii,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessInspectAscii).toHaveBeenCalledWith({
      textFile: '/tmp/ascii/render.txt',
      planFile: '/tmp/ascii/plan.json',
      outDir: '/tmp/ascii',
    })
    expect(process.exitCode).toBe(10)
  })

  it('dispatches render-ascii-preview to the svg preview renderer', async () => {
    const mockRunHarnessRenderAsciiPreview = jest.fn(async () => ({
      status: 'ok',
      artifact: 'ascii-preview.svg',
    }))

    process.argv = [
      'node',
      'pintora-harness',
      'render-ascii-preview',
      '--in',
      '/tmp/ascii/render.txt',
      '--out',
      '/tmp/ascii/ascii-preview.svg',
    ]

    jest.mock('../rendering/render-ascii-preview', () => ({
      runHarnessRenderAsciiPreview: mockRunHarnessRenderAsciiPreview,
    }))

    jest.isolateModules(() => {
      require('../cli')
    })

    await new Promise(resolve => setImmediate(resolve))

    expect(mockRunHarnessRenderAsciiPreview).toHaveBeenCalledWith({
      textFile: '/tmp/ascii/render.txt',
      outFile: '/tmp/ascii/ascii-preview.svg',
    })
    expect(process.exitCode).toBeUndefined()
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
})
