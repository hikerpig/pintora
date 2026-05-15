import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RunSuiteCaseResult, RunSuiteOptions, RunSuiteSummary } from './run-contracts'
import { runHarnessCase } from './run-case'
import { resolveSuiteCaseIds } from './suite-selector'
import type { HarnessOrchestrationActionType } from '../review/apply-review-contracts'

const ORCHESTRATION_ACTION_TYPES: ReadonlySet<HarnessOrchestrationActionType> = new Set([
  'accept',
  'repair',
  'rerun',
  'escalate',
])

function readCaseReviewDecision(artifactsDir: string): HarnessOrchestrationActionType | undefined {
  const decisionPath = path.join(artifactsDir, 'review-decision.json')
  if (!fs.existsSync(decisionPath)) return undefined
  try {
    const data = JSON.parse(fs.readFileSync(decisionPath, 'utf-8'))
    const type = data?.next_step?.type
    return ORCHESTRATION_ACTION_TYPES.has(type) ? type : undefined
  } catch {
    return undefined
  }
}

async function runWithConcurrency<T>(items: string[], maxConcurrency: number, worker: (item: string) => Promise<T>) {
  const results = new Array<T>(items.length)
  const requestedLimit = Number.isFinite(maxConcurrency) ? maxConcurrency : 1
  const limit = Math.max(1, Math.floor(requestedLimit))
  let nextIndex = 0

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex++
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext)
  await Promise.all(workers)
  return results
}

export async function runHarnessSuite(opts: RunSuiteOptions): Promise<RunSuiteSummary> {
  const caseIds = resolveSuiteCaseIds({ cwd: opts.cwd, suite: opts.suite })
  if (caseIds.length === 0) throw new Error(`Harness suite ${opts.suite} resolved no cases`)

  const cases = await runWithConcurrency(caseIds, opts.maxConcurrency, async (caseId): Promise<RunSuiteCaseResult> => {
    const caseArtifactsDir = path.join(opts.artifactsDir, caseId)
    try {
      const result = await runHarnessCase({
        cwd: opts.cwd,
        caseId,
        artifactsDir: caseArtifactsDir,
        baseUrl: opts.baseUrl,
        viewport: opts.viewport,
        enableCaptureBrowser: opts.enableCaptureBrowser,
      })
      return {
        caseId,
        status: result.status,
        summary: path.join(caseId, result.summary),
        captureBrowserTriggered: result.captureBrowserTriggered,
        reviewDecision: readCaseReviewDecision(caseArtifactsDir),
      }
    } catch {
      return {
        caseId,
        status: 'fail',
        summary: path.join(caseId, 'summary.json'),
        captureBrowserTriggered: false,
        reviewDecision: readCaseReviewDecision(caseArtifactsDir),
      }
    }
  })

  const summary: RunSuiteSummary = {
    suite: opts.suite,
    total: cases.length,
    ok: 0,
    suspicious: 0,
    fail: 0,
    captureBrowserTriggeredCount: 0,
    accepted: 0,
    needsRepair: 0,
    needsRerun: 0,
    escalated: 0,
    reviewPending: 0,
    cases,
  }

  for (const item of cases) {
    if (item.status === 'ok') summary.ok++
    else if (item.status === 'suspicious') summary.suspicious++
    else if (item.status === 'fail') summary.fail++
    if (item.captureBrowserTriggered) summary.captureBrowserTriggeredCount++
    if (item.reviewDecision === 'accept') summary.accepted++
    else if (item.reviewDecision === 'repair') summary.needsRepair++
    else if (item.reviewDecision === 'rerun') summary.needsRerun++
    else if (item.reviewDecision === 'escalate') summary.escalated++
    if (item.status !== 'ok' && item.reviewDecision === undefined) summary.reviewPending++
  }

  fs.mkdirSync(opts.artifactsDir, { recursive: true })
  fs.writeFileSync(path.join(opts.artifactsDir, 'suite.json'), JSON.stringify(summary, null, 2))

  return summary
}
