describe('runHarnessCase lazy capture import', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('does not import capture-browser when browser capture is disabled', async () => {
    jest.doMock('../rendering/render-svg', () => ({
      runHarnessRenderSvg: jest.fn(async () => ({ status: 'ok', diagramType: 'er', artifact: 'render.svg' })),
    }))

    jest.doMock('../inspection/inspect-svg', () => ({
      runHarnessInspectSvg: jest.fn(async () => ({
        status: 'suspicious',
        findingCount: 1,
        artifacts: ['metrics.json', 'findings.json'],
      })),
    }))

    jest.doMock('../summary/summarize-case', () => ({
      runHarnessSummarizeCase: jest.fn(async () => ({
        status: 'suspicious',
        nextAction: 'capture_browser',
        summary: 'summary.json',
        exitCode: 10,
      })),
    }))

    jest.doMock('../browser/capture-browser', () => {
      throw new Error('capture-browser should not be imported when disabled')
    })

    const { runHarnessCase } = require('../orchestration/run-case') as typeof import('../orchestration/run-case')

    await expect(
      runHarnessCase({
        cwd: process.cwd(),
        caseId: 'er.relationship-spacing-01',
        artifactsDir: '/tmp/harness-case',
        enableCaptureBrowser: false,
      }),
    ).resolves.toMatchObject({
      captureBrowserTriggered: false,
      nextAction: 'capture_browser',
    })
  })
})
