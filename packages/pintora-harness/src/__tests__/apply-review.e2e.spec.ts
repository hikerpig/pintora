import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessReviewCase } from '../review/review-case'
import { runHarnessApplyReview } from '../review/apply-review'

describe('apply-review e2e', () => {
  function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-apply-review-e2e-'))
  }

  function prepareArtifacts(artifactsDir: string) {
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
          pipeline: ['render', 'inspect', 'summarize'],
          artifacts: {
            svg: 'render.svg',
            png: null,
            browser_png: null,
            dom_html: null,
            metrics: 'metrics.json',
            findings: 'findings.json',
          },
          scores: {
            legibility: null,
            structural_clarity: null,
            spatial_balance: null,
            visual_taste: null,
          },
          top_findings: [],
          next_action: 'done',
          judge: {
            required: false,
            inputs: {
              artifacts: [],
            },
          },
        },
        null,
        2,
      ),
    )
  }

  it('review-case + apply-review produces a stable decision file', async () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const decisionFile = path.join(artifactsDir, 'review-decision.json')

    prepareArtifacts(artifactsDir)

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

    const decision = JSON.parse(fs.readFileSync(decisionFile, 'utf8'))
    expect(decision.status).toBe('completed')
    expect(decision.review_status).toBe('consumed')
    expect(decision.source.summary).toBe('summary.json')
    expect(decision.source.review).toBe('review.json')
    // noop adapter produces verdict 'inconclusive', which maps to 'escalate'
    expect(decision.next_step.type).toBe('escalate')
  })
})
