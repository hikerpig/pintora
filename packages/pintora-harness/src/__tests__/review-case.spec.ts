import * as fs from 'node:fs'
import * as path from 'node:path'
import { runHarnessReviewCase } from '../review/review-case'
import { makeTempDir, prepareReviewArtifacts, readJson } from '../test-helpers/harness'

describe('runHarnessReviewCase', () => {
  it('writes review.json and returns stable stdout metadata', async () => {
    const artifactsDir = makeTempDir('pintora-harness-review-case-')
    const outFile = path.join(artifactsDir, 'review.json')

    prepareReviewArtifacts(artifactsDir)

    const result = await runHarnessReviewCase({
      artifactsDir,
      adapter: 'manual-review-pack',
      outFile,
    })

    expect(result).toEqual({
      adapter: 'manual-review-pack',
      status: 'completed',
      verdict: 'needs_human_review',
      review: 'review.json',
    })
    expect(readJson(outFile)).toEqual({
      adapter: 'manual-review-pack',
      status: 'completed',
      verdict: 'needs_human_review',
      confidence: null,
      summary: 'browser evidence and structural findings require human judgment',
      artifacts: {
        pack_dir: 'review-pack',
      },
    })
  })

  it('writes review.json for a nested output path', async () => {
    const artifactsDir = makeTempDir('pintora-harness-review-case-')
    const outFile = path.join(artifactsDir, 'nested', 'review', 'review.json')

    prepareReviewArtifacts(artifactsDir)

    const result = await runHarnessReviewCase({
      artifactsDir,
      adapter: 'manual-review-pack',
      outFile,
    })

    expect(fs.existsSync(outFile)).toBe(true)
    expect(readJson(outFile)).toEqual({
      adapter: 'manual-review-pack',
      status: 'completed',
      verdict: 'needs_human_review',
      confidence: null,
      summary: 'browser evidence and structural findings require human judgment',
      artifacts: {
        pack_dir: 'review-pack',
      },
    })
    expect(result.review).toBe('review.json')
  })

  it('throws when summary.json is missing', async () => {
    const artifactsDir = makeTempDir('pintora-harness-review-case-')

    await expect(
      runHarnessReviewCase({
        artifactsDir,
        adapter: 'noop',
        outFile: path.join(artifactsDir, 'review.json'),
      }),
    ).rejects.toThrow('Missing required artifact: summary.json')
  })

  it('throws when artifactsDir does not exist', async () => {
    const artifactsDir = path.join(makeTempDir('pintora-harness-review-case-'), 'missing')

    await expect(
      runHarnessReviewCase({
        artifactsDir,
        adapter: 'noop',
        outFile: path.join(artifactsDir, 'review.json'),
      }),
    ).rejects.toThrow(`Artifacts directory does not exist: ${artifactsDir}`)
  })
})
