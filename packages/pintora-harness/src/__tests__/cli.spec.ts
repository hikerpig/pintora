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

  it('maps --no-capture-browser to enableCaptureBrowser=false for run-case', async () => {
    process.argv = [
      'node',
      'pintora-harness',
      'run-case',
      '--case',
      'er.relationship-spacing-01',
      '--artifacts-dir',
      '/tmp/harness-case',
      '--no-capture-browser',
    ]

    const runHarnessCase = jest.fn(async () => ({
      status: 'suspicious' as const,
      nextAction: 'capture_browser' as const,
      artifactsDir: '/tmp/harness-case',
      summary: 'summary.json',
      captureBrowserTriggered: false,
    }))

    jest.doMock('../orchestration/run-case', () => ({
      runHarnessCase,
    }))

    await jest.isolateModulesAsync(async () => {
      require('../cli')
      await new Promise(resolve => setImmediate(resolve))
    })

    expect(runHarnessCase).toHaveBeenCalledWith(
      expect.objectContaining({
        enableCaptureBrowser: false,
      }),
    )
  })
})
