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
})
