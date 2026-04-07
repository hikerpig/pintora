import { runHarnessCase } from '../orchestration/run-case'

const calls: string[] = []

jest.mock('../rendering/render-svg', () => ({
  runHarnessRenderSvg: jest.fn(async () => {
    calls.push('render')
    return { status: 'ok', diagramType: 'er', artifact: 'render.svg' }
  }),
}))

jest.mock('../inspection/inspect-svg', () => ({
  runHarnessInspectSvg: jest.fn(async () => {
    calls.push('inspect')
    return { status: 'suspicious', findingCount: 1, artifacts: ['metrics.json', 'findings.json'] }
  }),
}))

const mockSummaries = [
  { status: 'suspicious', nextAction: 'capture_browser', summary: 'summary.json', exitCode: 10 },
  { status: 'suspicious', nextAction: 'human_review_or_visual_judge', summary: 'summary.json', exitCode: 10 },
]

jest.mock('../summary/summarize-case', () => ({
  runHarnessSummarizeCase: jest.fn(async () => {
    calls.push('summarize')
    return mockSummaries.shift()
  }),
}))

jest.mock('../browser/capture-browser', () => ({
  runHarnessCaptureBrowser: jest.fn(async () => {
    calls.push('capture')
    return { status: 'ok', artifacts: ['browser.png', 'dom.html'], renderer: 'svg-preview' }
  }),
}))

describe('runHarnessCase', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('runs render, inspect, summarize, capture, summarize when escalation is requested', async () => {
    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir: '/tmp/harness-case',
      enableCaptureBrowser: true,
    })

    expect(calls).toEqual(['render', 'inspect', 'summarize', 'capture', 'summarize'])
    expect(result.captureBrowserTriggered).toBe(true)
    expect(result.nextAction).toBe('human_review_or_visual_judge')
  })

  it('does not run capture-browser when browser capture is disabled', async () => {
    mockSummaries.splice(
      0,
      mockSummaries.length,
      { status: 'suspicious', nextAction: 'capture_browser', summary: 'summary.json', exitCode: 10 },
    )

    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir: '/tmp/harness-case',
      enableCaptureBrowser: false,
    })

    expect(calls).toEqual(['render', 'inspect', 'summarize'])
    expect(result.captureBrowserTriggered).toBe(false)
    expect(result.nextAction).toBe('capture_browser')
  })
})
