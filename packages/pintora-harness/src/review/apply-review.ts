import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  HarnessOrchestrationAction,
  HarnessOrchestrationActionType,
  HarnessReviewDecision,
  RunHarnessApplyReviewOptions,
  RunHarnessApplyReviewResult,
} from './apply-review-contracts'
import type {
  HarnessReviewActionType,
  HarnessReviewResult,
  HarnessReviewVerdict,
} from './review-contracts'
import type { HarnessSummary } from '../contracts/summary'

const VALID_ACTION_TYPES: HarnessOrchestrationActionType[] = ['accept', 'repair', 'rerun', 'escalate']
const VALID_TARGETS = ['diagram_source', 'render_pipeline', 'browser_capture'] as const

const VERDICT_FALLBACK: Record<HarnessReviewVerdict, HarnessOrchestrationActionType> = {
  accept: 'accept',
  reject: 'repair',
  needs_human_review: 'escalate',
  inconclusive: 'escalate',
}

const RECOMMENDED_ACTION_MAP: Record<HarnessReviewActionType, HarnessOrchestrationActionType> = {
  accept: 'accept',
  reject: 'repair',
  repair: 'repair',
  rerun: 'rerun',
  escalate: 'escalate',
}

function assertDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`)
  }
}

function assertFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`)
  }
}

function readJsonFile(filePath: string): unknown {
  const content = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(content)
}

function assertValidSummary(summary: unknown): asserts summary is HarnessSummary {
  if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) {
    throw new Error('Invalid summary: expected an object')
  }
  const s = summary as Record<string, unknown>
  if (typeof s.run_id !== 'string') {
    throw new Error('Invalid summary: run_id must be a string')
  }
}

function assertValidReview(review: unknown): asserts review is HarnessReviewResult {
  if (typeof review !== 'object' || review === null || Array.isArray(review)) {
    throw new Error('Invalid review: expected an object')
  }
  const r = review as Record<string, unknown>
  if (r.status !== 'completed') {
    throw new Error(`Invalid review: status must be 'completed', got ${r.status}`)
  }
  if (r.recommended_action) {
    const action = r.recommended_action as Record<string, unknown>
    const mapped = RECOMMENDED_ACTION_MAP[action.type as HarnessReviewActionType]
    if (mapped === undefined) {
      throw new Error(`Invalid review: recommended_action.type is not valid: ${action.type}`)
    }
    if (action.target !== undefined && !VALID_TARGETS.includes(action.target as typeof VALID_TARGETS[number])) {
      throw new Error(`Invalid review: recommended_action.target is not valid: ${action.target}`)
    }
  }
}

function assertContextMatch(summary: HarnessSummary, review: HarnessReviewResult) {
  if (review.run_id && review.run_id !== summary.run_id) {
    throw new Error(
      `Context mismatch: review.run_id (${review.run_id}) does not match summary.run_id (${summary.run_id})`,
    )
  }
}

function resolveOrchestrationAction(review: HarnessReviewResult): HarnessOrchestrationAction {
  if (review.recommended_action) {
    const mapped = RECOMMENDED_ACTION_MAP[review.recommended_action.type]
    return {
      type: mapped,
      reason: review.recommended_action.reason,
      target: review.recommended_action.target,
    }
  }
  return {
    type: VERDICT_FALLBACK[review.verdict],
  }
}

export function runHarnessApplyReview(opts: RunHarnessApplyReviewOptions): RunHarnessApplyReviewResult {
  assertDirExists(opts.artifactsDir)

  const summaryPath = path.join(opts.artifactsDir, 'summary.json')
  assertFileExists(summaryPath)

  const summary = readJsonFile(summaryPath)
  assertValidSummary(summary)

  assertFileExists(opts.reviewFile)
  const review = readJsonFile(opts.reviewFile)
  assertValidReview(review)

  assertContextMatch(summary, review)

  const nextStep = resolveOrchestrationAction(review)

  const decision: HarnessReviewDecision = {
    status: 'completed',
    review_status: 'consumed',
    source: {
      summary: path.relative(opts.artifactsDir, summaryPath),
      review: path.relative(opts.artifactsDir, opts.reviewFile),
    },
    next_step: nextStep,
  }

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, JSON.stringify(decision, null, 2))

  return {
    status: 'completed',
    review_status: 'consumed',
    decision: path.basename(opts.outFile),
  }
}
