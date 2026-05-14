import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessApplyReview } from '../review/apply-review'
import { makeTempDir, readJson, writeJson, writeReview, writeSummary } from '../test-helpers/harness'

function makeApplyReviewPaths() {
  const artifactsDir = makeTempDir('pintora-harness-apply-review-')
  return {
    artifactsDir,
    reviewFile: path.join(artifactsDir, 'review.json'),
    outFile: path.join(artifactsDir, 'review-decision.json'),
  }
}

function applyReviewWith(overrides?: Record<string, unknown>) {
  const paths = makeApplyReviewPaths()
  writeSummary(paths.artifactsDir)
  writeReview(paths.reviewFile, overrides)
  runHarnessApplyReview(paths)
  return readJson<{ next_step: { type: string; reason?: string; target?: string } }>(paths.outFile)
}

describe('runHarnessApplyReview', () => {
  it('reads summary and review, writes review-decision.json, and returns metadata', () => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeSummary(artifactsDir)
    writeReview(reviewFile)

    const result = runHarnessApplyReview({ artifactsDir, reviewFile, outFile })

    expect(result).toEqual({
      status: 'completed',
      review_status: 'consumed',
      decision: 'review-decision.json',
    })
    expect(readJson(outFile)).toEqual({
      status: 'completed',
      review_status: 'consumed',
      source: {
        summary: 'summary.json',
        review: 'review.json',
      },
      next_step: {
        type: 'accept',
      },
    })
  })

  it.each([
    ['reject', 'repair'],
    ['needs_human_review', 'escalate'],
    ['inconclusive', 'escalate'],
  ])('falls back from verdict %s to orchestration action %s', (verdict, action) => {
    const written = applyReviewWith({ verdict })
    expect(written.next_step.type).toBe(action)
  })

  it('lets recommended_action override verdict and carries reason and target', () => {
    const written = applyReviewWith({
      verdict: 'reject',
      recommended_action: {
        type: 'rerun',
        reason: 'browser capture flaky',
        target: 'browser_capture',
      },
    })

    expect(written.next_step).toEqual({
      type: 'rerun',
      reason: 'browser capture flaky',
      target: 'browser_capture',
    })
  })

  it('maps reject recommended_action to repair', () => {
    const written = applyReviewWith({
      recommended_action: {
        type: 'reject',
        reason: 'text overlaps',
        target: 'diagram_source',
      },
    })

    expect(written.next_step.type).toBe('repair')
  })

  it('throws when artifactsDir does not exist', () => {
    const artifactsDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now())
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow('Directory does not exist')
  })

  it('throws when summary.json is missing', () => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeReview(reviewFile)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow('File does not exist')
  })

  it('throws when review.json is missing', () => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeSummary(artifactsDir)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow('File does not exist')
  })

  it.each([
    ['review.status', { status: 'failed' }, "status must be 'completed'"],
    ['review.verdict', { verdict: undefined }, 'verdict is not valid'],
    [
      'recommended_action.type',
      { recommended_action: { type: 'deploy_to_production' } },
      'recommended_action.type is not valid',
    ],
    [
      'recommended_action.target',
      { recommended_action: { type: 'repair', target: 'deploy_to_production' } },
      'recommended_action.target is not valid',
    ],
  ])('throws when %s is invalid', (_name, reviewOverrides, expectedMessage) => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeSummary(artifactsDir)
    writeReview(reviewFile, reviewOverrides)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(expectedMessage)
  })

  it('throws when run_id context mismatches', () => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeSummary(artifactsDir, { run_id: 'run-a' })
    writeReview(reviewFile, { run_id: 'run-b' })

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow('Context mismatch')
  })

  it('writes to a nested output path', () => {
    const { artifactsDir, reviewFile } = makeApplyReviewPaths()
    const outFile = path.join(artifactsDir, 'nested', 'decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile)

    const result = runHarnessApplyReview({ artifactsDir, reviewFile, outFile })

    expect(fs.existsSync(outFile)).toBe(true)
    expect(result.decision).toBe('decision.json')
  })

  it.each([
    ['summary.json is not an object', [1, 2, 3], 'Invalid summary: expected an object'],
    ['summary.json run_id is not a string', { run_id: 123 }, 'Invalid summary: run_id must be a string'],
  ])('throws when %s', (_name, summary, expectedMessage) => {
    const { artifactsDir, reviewFile, outFile } = makeApplyReviewPaths()

    writeJson(path.join(artifactsDir, 'summary.json'), summary)
    writeReview(reviewFile)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(expectedMessage)
  })
})
