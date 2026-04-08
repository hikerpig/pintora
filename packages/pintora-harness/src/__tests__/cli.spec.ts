describe('pintora-harness cli shell', () => {
  const originalArgv = process.argv.slice()
  const originalExitCode = process.exitCode

  beforeEach(() => {
    jest.resetModules()
    process.argv = ['node', 'pintora-harness', '--help']
    process.exitCode = undefined
  })

  afterEach(() => {
    process.argv = originalArgv.slice()
    process.exitCode = originalExitCode
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
})
