import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export function makeTempDir(prefix = 'pintora-harness-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

export function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

export function makeSummary(overrides?: Record<string, unknown>) {
  return {
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
  }
}

export function writeSummary(artifactsDir: string, overrides?: Record<string, unknown>) {
  writeJson(path.join(artifactsDir, 'summary.json'), makeSummary(overrides))
}

export function makeReview(overrides?: Record<string, unknown>) {
  return {
    adapter: 'manual-review-pack',
    status: 'completed',
    verdict: 'accept',
    confidence: null,
    summary: 'looks good',
    artifacts: {},
    ...overrides,
  }
}

export function writeReview(reviewFile: string, overrides?: Record<string, unknown>) {
  writeJson(reviewFile, makeReview(overrides))
}

export function prepareReviewArtifacts(artifactsDir: string, summaryOverrides?: Record<string, unknown>) {
  writeJson(path.join(artifactsDir, 'metrics.json'), { rootChildCount: 1 })
  writeJson(path.join(artifactsDir, 'findings.json'), [])
  fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')
  writeSummary(artifactsDir, {
    run_id: path.basename(artifactsDir),
    case_id: null,
    diagram_type: null,
    status: 'ok',
    next_action: 'done',
    top_findings: [],
    judge: {
      required: false,
      inputs: {
        artifacts: ['render.svg', 'metrics.json', 'findings.json'],
      },
    },
    ...summaryOverrides,
  })
}
