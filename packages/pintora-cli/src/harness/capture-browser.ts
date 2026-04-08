import { DEFAULT_CAPTURE_ARTIFACTS, DEFAULT_CAPTURE_VIEWPORT } from './browser-contracts'
import { capturePreviewArtifacts } from './browser-capture'
import { buildBrowserPreviewUrl } from './browser-preview-url'
import { readHarnessSource, resolveHarnessInput } from './read-input'

export async function runHarnessCaptureBrowser(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outDir: string
  baseUrl?: string
  viewport?: { width: number; height: number }
}) {
  const resolved = resolveHarnessInput({
    cwd: opts.cwd,
    caseId: opts.caseId,
    inputFile: opts.inputFile,
  })
  const code = readHarnessSource(resolved.inputFile)
  const previewUrl = buildBrowserPreviewUrl({
    code,
    baseUrl: opts.baseUrl,
  })

  await capturePreviewArtifacts({
    previewUrl,
    outDir: opts.outDir,
    viewport: opts.viewport || DEFAULT_CAPTURE_VIEWPORT,
  })

  return {
    status: 'ok' as const,
    artifacts: [DEFAULT_CAPTURE_ARTIFACTS.screenshot, DEFAULT_CAPTURE_ARTIFACTS.dom],
    renderer: 'svg-preview' as const,
    previewUrl,
  }
}
