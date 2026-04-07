import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessReviewCase } from '../review/review-case'

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-review-case-'))
}

function prepareReviewArtifacts(artifactsDir: string) {
  fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify({ rootChildCount: 1 }, null, 2))
  fs.writeFileSync(path.join(artifactsDir, 'findings.json'), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')
  fs.writeFileSync(
    path.join(artifactsDir, 'summary.json'),
    JSON.stringify(
      {
        run_id: path.basename(artifactsDir),
        case_id: null,
        diagram_type: null,
        status: 'ok',
        next_action: 'done',
        top_findings: [],
        artifacts: {
          svg: 'render.svg',
          browser_png: null,
          dom_html: null,
          metrics: 'metrics.json',
          findings: 'findings.json',
        },
        judge: {
          inputs: {
            artifacts: ['render.svg', 'metrics.json', 'findings.json'],
          },
        },
      },
      null,
      2,
    ),
  )
}

describe('runHarnessReviewCase', () => {
  it('writes review.json and returns stable stdout metadata', async () => {
    const artifactsDir = makeTempDir()
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
    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toEqual({
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
    const artifactsDir = makeTempDir()
    const outFile = path.join(artifactsDir, 'nested', 'review', 'review.json')

    prepareReviewArtifacts(artifactsDir)

    const result = await runHarnessReviewCase({
      artifactsDir,
      adapter: 'manual-review-pack',
      outFile,
    })

    expect(fs.existsSync(outFile)).toBe(true)
    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toEqual({
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
    const artifactsDir = makeTempDir()

    await expect(
      runHarnessReviewCase({
        artifactsDir,
        adapter: 'noop',
        outFile: path.join(artifactsDir, 'review.json'),
      }),
    ).rejects.toThrow('Missing required artifact: summary.json')
  })

  it('throws when artifactsDir does not exist', async () => {
    const artifactsDir = path.join(makeTempDir(), 'missing')

    await expect(
      runHarnessReviewCase({
        artifactsDir,
        adapter: 'noop',
        outFile: path.join(artifactsDir, 'review.json'),
      }),
    ).rejects.toThrow(`Artifacts directory does not exist: ${artifactsDir}`)
  })
})
