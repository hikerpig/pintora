describe('pintora cli command surface', () => {
  const originalArgv = process.argv.slice()

  beforeEach(() => {
    jest.resetModules()
    process.argv = ['node', 'pintora', '--help']
  })

  afterEach(() => {
    process.argv = originalArgv.slice()
    jest.restoreAllMocks()
  })

  it('only exposes the render command at the top level', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(() => {
      jest.isolateModules(() => {
        require('../cli')
      })
    }).not.toThrow()

    const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n')
    expect(output).toContain('render')
    expect(output).not.toContain('harness')
  })
})
