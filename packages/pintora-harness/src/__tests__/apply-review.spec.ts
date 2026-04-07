import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessApplyReview } from '../review/apply-review'

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-apply-review-'))
}

function writeSummary(artifactsDir: string, overrides?: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(artifactsDir, 'summary.json'),
    JSON.stringify(
      {
        run_id: 'test-run',
        case_id: null,
        diagram_type: null,
        status: 'suspicious',
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
        next_action: 'human_review_or_visual_judge',
        judge: {
          required: true,
          inputs: {
            artifacts: ['render.svg', 'metrics.json', 'findings.json'],
          },
        },
        ...overrides,
      },
      null,
      2,
    ),
  )
}

function writeReview(reviewFile: string, overrides?: Record<string, unknown>) {
  fs.writeFileSync(
    reviewFile,
    JSON.stringify(
      {
        adapter: 'manual-review-pack',
        status: 'completed',
        verdict: 'accept',
        confidence: null,
        summary: 'looks good',
        artifacts: {},
        ...overrides,
      },
      null,
      2,
    ),
  )
}

describe('runHarnessApplyReview', () => {
  it('reads summary and review, writes review-decision.json, and returns metadata', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile)

    const result = runHarnessApplyReview({ artifactsDir, reviewFile, outFile })

    expect(result).toEqual({
      status: 'completed',
      review_status: 'consumed',
      decision: 'review-decision.json',
    })

    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written).toEqual({
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

  it('falls back to repair when recommended_action is absent and verdict is reject', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, { verdict: 'reject', recommended_action: undefined })

    runHarnessApplyReview({ artifactsDir, reviewFile, outFile })
    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written.next_step.type).toBe('repair')
  })

  it('maps needs_human_review verdict to escalate', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, { verdict: 'needs_human_review' })

    runHarnessApplyReview({ artifactsDir, reviewFile, outFile })
    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written.next_step.type).toBe('escalate')
  })

  it('maps inconclusive verdict to escalate', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, { verdict: 'inconclusive' })

    runHarnessApplyReview({ artifactsDir, reviewFile, outFile })
    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written.next_step.type).toBe('escalate')
  })

  it('lets recommended_action override verdict', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, {
      verdict: 'reject',
      recommended_action: {
        type: 'rerun',
        reason: 'browser capture flaky',
        target: 'browser_capture',
      },
    })

    runHarnessApplyReview({ artifactsDir, reviewFile, outFile })
    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written.next_step).toEqual({
      type: 'rerun',
      reason: 'browser capture flaky',
      target: 'browser_capture',
    })
  })

  it('maps reject recommended_action to repair', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, {
      recommended_action: {
        type: 'reject',
        reason: 'text overlaps',
        target: 'diagram_source',
      },
    })

    runHarnessApplyReview({ artifactsDir, reviewFile, outFile })
    const written = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(written.next_step.type).toBe('repair')
  })

  it('throws when artifactsDir does not exist', () => {
    const artifactsDir = path.join(os.tmpdir(), 'nonexistent-dir-' + Date.now())
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'Directory does not exist',
    )
  })

  it('throws when summary.json is missing', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeReview(reviewFile)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'File does not exist',
    )
  })

  it('throws when review.json is missing', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'File does not exist',
    )
  })

  it("throws when review.status is not 'completed'", () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, { status: 'failed' })

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      "status must be 'completed'",
    )
  })

  it('throws when recommended_action.type is invalid', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, {
      recommended_action: { type: 'deploy_to_production' },
    })

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'recommended_action.type is not valid',
    )
  })

  it('throws when run_id context mismatches', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir, { run_id: 'run-a' })
    writeReview(reviewFile, { run_id: 'run-b' })

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'Context mismatch',
    )
  })

  it('writes to a nested output path', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'nested', 'decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile)

    const result = runHarnessApplyReview({ artifactsDir, reviewFile, outFile })

    expect(fs.existsSync(outFile)).toBe(true)
    expect(result.decision).toBe('decision.json')
  })

  it('throws when summary.json is not an object', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify([1, 2, 3]))
    writeReview(reviewFile)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'Invalid summary: expected an object',
    )
  })

  it('throws when summary.json run_id is not a string', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify({ run_id: 123 }))
    writeReview(reviewFile)

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'Invalid summary: run_id must be a string',
    )
  })

  it('throws when recommended_action.target is invalid', () => {
    const artifactsDir = makeTempDir()
    const reviewFile = path.join(artifactsDir, 'review.json')
    const outFile = path.join(artifactsDir, 'review-decision.json')

    writeSummary(artifactsDir)
    writeReview(reviewFile, {
      recommended_action: {
        type: 'repair',
        target: 'deploy_to_production',
      },
    })

    expect(() => runHarnessApplyReview({ artifactsDir, reviewFile, outFile })).toThrow(
      'recommended_action.target is not valid',
    )
  })
})
