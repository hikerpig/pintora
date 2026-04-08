import * as path from 'node:path'
import { runHarnessCaptureBrowser } from '../browser/capture-browser'
import { runHarnessInspectSvg } from '../inspection/inspect-svg'
import { runHarnessRenderSvg } from '../rendering/render-svg'
import { runHarnessSummarizeCase } from '../summary/summarize-case'
import type { RunCaseOptions, RunCaseResult } from './run-contracts'

export async function executeHarnessCase(opts: RunCaseOptions): Promise<RunCaseResult> {
  const renderFile = path.join(opts.artifactsDir, 'render.svg')
  const summaryFile = path.join(opts.artifactsDir, 'summary.json')

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

  let summary = await runHarnessSummarizeCase({
    artifactsDir: opts.artifactsDir,
    outFile: summaryFile,
  })

  let captureBrowserTriggered = false
  if (summary.nextAction === 'capture_browser' && opts.enableCaptureBrowser) {
    await runHarnessCaptureBrowser({
      cwd: opts.cwd,
      caseId: opts.caseId,
      inputFile: opts.inputFile,
      outDir: opts.artifactsDir,
      baseUrl: opts.baseUrl,
      viewport: opts.viewport,
    })
    captureBrowserTriggered = true
    summary = await runHarnessSummarizeCase({
      artifactsDir: opts.artifactsDir,
      outFile: summaryFile,
    })
  }

  return {
    status: summary.status,
    nextAction: summary.nextAction,
    artifactsDir: opts.artifactsDir,
    summary: summary.summary,
    captureBrowserTriggered,
  }
}
