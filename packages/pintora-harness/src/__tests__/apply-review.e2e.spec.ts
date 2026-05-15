import * as fs from 'node:fs'
import * as path from 'node:path'
import { runHarnessReviewCase } from '../review/review-case'
import { runHarnessApplyReview } from '../review/apply-review'
import { makeTempDir, prepareReviewArtifacts, readJson } from '../test-helpers/harness'

describe('apply-review e2e', () => {
  it('review-case + apply-review produces a stable decision file', async () => {
    const artifactsDir = makeTempDir('pintora-harness-apply-review-e2e-')
    const reviewFile = path.join(artifactsDir, 'review.json')
    const decisionFile = path.join(artifactsDir, 'review-decision.json')

    prepareReviewArtifacts(artifactsDir, {
      judge: {
        required: false,
        inputs: {
          artifacts: [],
        },
      },
    })

    await runHarnessReviewCase({
      artifactsDir,
      adapter: 'noop',
      outFile: reviewFile,
    })

    const applyResult = runHarnessApplyReview({
      artifactsDir,
      reviewFile,
      outFile: decisionFile,
    })

    expect(applyResult.status).toBe('completed')
    expect(applyResult.review_status).toBe('consumed')
    expect(fs.existsSync(decisionFile)).toBe(true)

    const decision = readJson<{
      status: string
      review_status: string
      source: Record<string, string>
      next_step: { type: string }
    }>(decisionFile)
    expect(decision.status).toBe('completed')
    expect(decision.review_status).toBe('consumed')
    expect(decision.source.summary).toBe('summary.json')
    expect(decision.source.review).toBe('review.json')
    // noop adapter produces verdict 'inconclusive', which maps to 'escalate'
    expect(decision.next_step.type).toBe('escalate')
  })
})
