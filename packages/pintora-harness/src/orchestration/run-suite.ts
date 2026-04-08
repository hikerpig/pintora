import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RunSuiteOptions, RunSuiteSummary } from './run-contracts'
import { runHarnessCase } from './run-case'
import { resolveSuiteCaseIds } from './suite-selector'

export async function runHarnessSuite(opts: RunSuiteOptions): Promise<RunSuiteSummary> {
  const caseIds = resolveSuiteCaseIds({ cwd: opts.cwd, suite: opts.suite })
  if (caseIds.length === 0) throw new Error(`Harness suite ${opts.suite} resolved no cases`)

  const cases: RunSuiteSummary['cases'] = []
  for (const caseId of caseIds) {
    const caseArtifactsDir = path.join(opts.artifactsDir, caseId)
    const result = await runHarnessCase({
      cwd: opts.cwd,
      caseId,
      artifactsDir: caseArtifactsDir,
      baseUrl: opts.baseUrl,
      viewport: opts.viewport,
      enableCaptureBrowser: opts.enableCaptureBrowser,
    })
    cases.push({
      caseId,
      status: result.status,
      summary: path.join(caseId, result.summary),
      captureBrowserTriggered: result.captureBrowserTriggered,
    })
  }

  const summary: RunSuiteSummary = {
    suite: opts.suite,
    total: cases.length,
    ok: cases.filter(item => item.status === 'ok').length,
    suspicious: cases.filter(item => item.status === 'suspicious').length,
    fail: cases.filter(item => item.status === 'fail').length,
    captureBrowserTriggeredCount: cases.filter(item => item.captureBrowserTriggered).length,
    cases,
  }

  fs.mkdirSync(opts.artifactsDir, { recursive: true })
  fs.writeFileSync(path.join(opts.artifactsDir, 'suite.json'), JSON.stringify(summary, null, 2))

  return summary
}
