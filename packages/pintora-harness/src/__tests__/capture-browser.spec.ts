import * as mockFs from 'node:fs'
import * as mockOs from 'node:os'
import * as mockPath from 'node:path'
import { DEFAULT_CAPTURE_VIEWPORT } from '../contracts/browser'
import { capturePreviewArtifacts } from '../browser/browser-capture'
import { runHarnessCaptureBrowser } from '../browser/capture-browser'

jest.mock('../browser/browser-capture', () => ({
  capturePreviewArtifacts: jest.fn(async ({ outDir }) => {
    mockFs.mkdirSync(outDir, { recursive: true })
    mockFs.writeFileSync(mockPath.join(outDir, 'browser.png'), 'png-bytes')
    mockFs.writeFileSync(mockPath.join(outDir, 'dom.html'), '<html></html>')
    return {
      screenshotPath: mockPath.join(outDir, 'browser.png'),
      domPath: mockPath.join(outDir, 'dom.html'),
    }
  }),
}))

describe('runHarnessCaptureBrowser', () => {
  it('writes browser artifacts for a registry case', async () => {
    const mockCapturePreviewArtifacts = jest.mocked(capturePreviewArtifacts)
    const outDir = mockFs.mkdtempSync(mockPath.join(mockOs.tmpdir(), 'pintora-capture-browser-'))
    const result = await runHarnessCaptureBrowser({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outDir,
    })

    expect(result.status).toBe('ok')
    expect(result.renderer).toBe('svg-preview')
    expect(result.artifacts).toEqual(['browser.png', 'dom.html'])
    expect(result.previewUrl).toContain('renderer=svg')
    expect(result.previewUrl).toContain('e2e=true')
    expect(mockCapturePreviewArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        outDir,
        viewport: DEFAULT_CAPTURE_VIEWPORT,
      }),
    )
    expect(mockFs.existsSync(mockPath.join(outDir, 'browser.png'))).toBe(true)
    expect(mockFs.existsSync(mockPath.join(outDir, 'dom.html'))).toBe(true)
  })
})

describe('capturePreviewArtifacts', () => {
  it('waits for preview stability before capturing artifacts', async () => {
    const callOrder: string[] = []
    const { waitForStablePreview } = jest.requireActual(
      '../browser/browser-capture',
    ) as typeof import('../browser/browser-capture')
    const page = {
      waitForSelector: jest.fn(async (selector: string) => {
        callOrder.push(`waitForSelector:${selector}`)
      }),
      evaluate: jest.fn(async () => {
        callOrder.push('evaluate:fonts.ready')
      }),
      locator: jest.fn(() => ({
        boundingBox: jest.fn(async () => {
          callOrder.push('boundingBox:100x80')
          return { width: 100, height: 80 }
        }),
      })),
      waitForTimeout: jest.fn(async (ms: number) => {
        callOrder.push(`waitForTimeout:${ms}`)
      }),
    }

    await waitForStablePreview(page as any)

    expect(callOrder).toEqual([
      'waitForSelector:.preview',
      'evaluate:fonts.ready',
      'waitForSelector:.preview svg',
      'boundingBox:100x80',
      'waitForTimeout:50',
      'boundingBox:100x80',
    ])
  })
})
