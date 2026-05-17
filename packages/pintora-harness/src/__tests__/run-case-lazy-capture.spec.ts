describe('runHarnessCase browser capture loading', () => {
  afterEach(() => {
    jest.resetModules()
    jest.dontMock('../browser/capture-browser')
    jest.dontMock('../rendering/render-svg')
    jest.dontMock('../inspection/inspect-svg')
    jest.dontMock('../summary/summarize-case')
  })

  it('does not import browser capture while loading run-case', () => {
    jest.doMock('../browser/capture-browser', () => {
      throw new Error('capture-browser should be loaded lazily')
    })

    jest.doMock('../rendering/render-svg', () => ({
      runHarnessRenderSvg: jest.fn(),
    }))
    jest.doMock('../inspection/inspect-svg', () => ({
      runHarnessInspectSvg: jest.fn(),
    }))
    jest.doMock('../summary/summarize-case', () => ({
      runHarnessSummarizeCase: jest.fn(),
    }))

    expect(() => {
      jest.isolateModules(() => {
        require('../orchestration/run-case')
      })
    }).not.toThrow()
  })
})
