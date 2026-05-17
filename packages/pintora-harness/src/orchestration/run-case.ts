import * as path from 'node:path'
import { runHarnessInspectSvg } from '../inspection/inspect-svg'
import { runHarnessRenderSvg } from '../rendering/render-svg'
import { runHarnessSummarizeCase } from '../summary/summarize-case'
import type { RunCaseOptions, RunCaseResult } from './run-contracts'

export async function runHarnessCase(opts: RunCaseOptions): Promise<RunCaseResult> {
  const renderFile = path.join(opts.artifactsDir, 'render.svg')
  const summaryFile = path.join(opts.artifactsDir, 'summary.json')
  const summarizeOptions = {
    cwd: opts.cwd,
    caseId: opts.caseId,
    inputFile: opts.inputFile,
    artifactsDir: opts.artifactsDir,
    outFile: summaryFile,
  }

  await runHarnessRenderSvg({
    cwd: opts.cwd,
    caseId: opts.caseId,
    inputFile: opts.inputFile,
    outFile: renderFile,
  })

  await runHarnessInspectSvg({
    cwd: opts.cwd,
    svgFile: renderFile,
    caseId: opts.caseId,
    outDir: opts.artifactsDir,
  })

  let summary = await runHarnessSummarizeCase(summarizeOptions)

  let captureBrowserTriggered = false
  if (summary.nextAction === 'capture_browser' && opts.enableCaptureBrowser) {
    const { runHarnessCaptureBrowser } = (await Promise.resolve().then(() =>
      require('../browser/capture-browser'),
    )) as typeof import('../browser/capture-browser')
    await runHarnessCaptureBrowser({
      cwd: opts.cwd,
      caseId: opts.caseId,
      inputFile: opts.inputFile,
      outDir: opts.artifactsDir,
      baseUrl: opts.baseUrl,
      viewport: opts.viewport,
    })
    captureBrowserTriggered = true
    summary = await runHarnessSummarizeCase(summarizeOptions)
  }

  return {
    status: summary.status,
    nextAction: summary.nextAction,
    artifactsDir: opts.artifactsDir,
    summary: summary.summary,
    captureBrowserTriggered,
  }
}
