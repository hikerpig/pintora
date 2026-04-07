import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildHarnessReviewPayload } from '../review/review-payload'

function makeArtifactsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-review-payload-'))
}

function makeValidSummary(overrides: {
  run_id?: unknown
  case_id?: unknown
  diagram_type?: unknown
  status?: unknown
  next_action?: unknown
  top_findings?: unknown
  artifacts?: Record<string, unknown>
  judgeArtifacts?: unknown
} = {}) {
  return {
    run_id: overrides.run_id ?? 'run-123',
    case_id: overrides.case_id ?? 'er.relationship-spacing-01',
    diagram_type: overrides.diagram_type ?? 'er',
    status: overrides.status ?? 'suspicious',
    next_action: overrides.next_action ?? 'human_review_or_visual_judge',
    top_findings: overrides.top_findings ?? ['text is too close to edge'],
    artifacts: {
      svg: 'render.svg',
      png: null,
      browser_png: 'browser.png',
      dom_html: 'dom.html',
      metrics: 'metrics.json',
      findings: 'findings.json',
      ...(overrides.artifacts ?? {}),
    },
    judge: {
      required: true,
      inputs: {
        artifacts: overrides.judgeArtifacts ?? ['render.svg', 'browser.png', 'findings.json', 'dom.html'],
      },
    },
  }
}

function writeSummary(artifactsDir: string, summary: unknown) {
  fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify(summary, null, 2))
}

function writeArtifact(artifactsDir: string, relativePath: string, content = 'artifact') {
  const filePath = path.join(artifactsDir, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function writeArtifactDir(artifactsDir: string, relativePath: string) {
  fs.mkdirSync(path.join(artifactsDir, relativePath), { recursive: true })
}

function canCreateSymlink() {
  const dir = makeArtifactsDir()
  const target = path.join(dir, 'target.txt')
  const link = path.join(dir, 'link.txt')
  fs.writeFileSync(target, 'target')
  try {
    fs.symlinkSync(target, link)
    return true
  } catch {
    return false
  }
}

function writeReferencedArtifacts(
  artifactsDir: string,
  summary: ReturnType<typeof makeValidSummary>,
  opts: { skip?: string[] } = {},
) {
  const skip = new Set(opts.skip ?? [])
  const artifactPaths = [
    summary.artifacts.svg,
    summary.artifacts.browser_png,
    summary.artifacts.dom_html,
    summary.artifacts.metrics,
    summary.artifacts.findings,
  ]

  for (const artifactPath of artifactPaths) {
    if (typeof artifactPath === 'string' && !skip.has(artifactPath)) {
      writeArtifact(artifactsDir, artifactPath)
    }
  }

  for (const artifactPath of summary.judge.inputs.artifacts as string[]) {
    if (!skip.has(artifactPath)) {
      writeArtifact(artifactsDir, artifactPath)
    }
  }
}

describe('buildHarnessReviewPayload', () => {
  it('copies summary decision fields and preserves relative artifact paths', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary()
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary)

    const payload = buildHarnessReviewPayload({ artifactsDir })

    expect(payload).toEqual({
      run_id: 'run-123',
      case_id: 'er.relationship-spacing-01',
      diagram_type: 'er',
      status: 'suspicious',
      next_action: 'human_review_or_visual_judge',
      top_findings: ['text is too close to edge'],
      artifacts: {
        svg: 'render.svg',
        browser_png: 'browser.png',
        dom_html: 'dom.html',
        metrics: 'metrics.json',
        findings: 'findings.json',
        summary: 'summary.json',
      },
      judge_inputs: ['render.svg', 'browser.png', 'findings.json', 'dom.html'],
    })
  })

  it('throws when summary.json is missing', () => {
    const artifactsDir = makeArtifactsDir()

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow('Missing required artifact: summary.json')
  })

  it('throws when summary.json does not contain an object', () => {
    const artifactsDir = makeArtifactsDir()
    writeSummary(artifactsDir, ['not', 'an', 'object'])

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json to contain an object',
    )
  })

  it('throws when summary.json is invalid JSON', () => {
    const artifactsDir = makeArtifactsDir()
    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), '{not valid json')

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json to contain valid JSON',
    )
  })

  it('throws when summary.json is a directory', () => {
    const artifactsDir = makeArtifactsDir()
    writeArtifactDir(artifactsDir, 'summary.json')

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json to reference an existing artifact file',
    )
  })

  it('throws when summary.json symlink escapes artifactsDir', () => {
    if (!canCreateSymlink()) return

    const artifactsDir = makeArtifactsDir()
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-review-outside-summary-'))
    const outsideSummary = path.join(outsideDir, 'summary.json')
    fs.writeFileSync(outsideSummary, JSON.stringify(makeValidSummary(), null, 2))
    fs.symlinkSync(outsideSummary, path.join(artifactsDir, 'summary.json'))

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json to reference an artifact inside artifactsDir',
    )
  })

  it('throws when summary.json status is invalid', () => {
    const artifactsDir = makeArtifactsDir()
    writeSummary(artifactsDir, makeValidSummary({ status: 'broken' }))

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json status to be one of ok, suspicious, fail',
    )
  })

  it('throws when summary.json next_action is invalid', () => {
    const artifactsDir = makeArtifactsDir()
    writeSummary(artifactsDir, makeValidSummary({ next_action: 'wait' }))

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json next_action to be one of done, capture_browser, human_review_or_visual_judge, repair_and_rerun',
    )
  })

  it('throws when summary.json artifacts is not an object', () => {
    const artifactsDir = makeArtifactsDir()
    writeSummary(artifactsDir, {
      ...makeValidSummary(),
      artifacts: [],
    })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts to contain an object',
    )
  })

  it('throws when summary.json artifacts.metrics is an absolute path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { metrics: path.join(path.sep, 'tmp', 'metrics.json') } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.metrics as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.metrics to be a relative path',
    )
  })

  it('throws when summary.json artifacts.findings contains path traversal', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { findings: '../findings.json' } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.findings as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.findings to be a relative path',
    )
  })

  it('throws when summary.json artifacts.metrics is a Windows drive absolute path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { metrics: 'C:\\tmp\\metrics.json' } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.metrics as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.metrics to be a relative path',
    )
  })

  it('throws when summary.json artifacts.findings is a UNC path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { findings: '\\\\server\\share\\findings.json' } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.findings as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.findings to be a relative path',
    )
  })

  it('throws when summary.json top_findings is not an array of strings', () => {
    const artifactsDir = makeArtifactsDir()
    writeSummary(artifactsDir, makeValidSummary({ top_findings: ['ok', 123] }))

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json top_findings to contain an array of strings',
    )
  })

  it('throws when summary.json judge inputs contain path traversal', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ judgeArtifacts: ['render.svg', '../escape.png'] })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: ['../escape.png'] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json judge.inputs.artifacts to contain an array of relative paths',
    )
  })

  it('throws when a referenced artifact does not exist', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary()
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: ['metrics.json'] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.metrics to reference an existing artifact',
    )
  })

  it('throws when a judge input artifact does not exist', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ judgeArtifacts: ['render.svg', 'browser.png', 'findings.json', 'missing/dom.html'] })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: ['missing/dom.html'] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json judge.inputs.artifacts[3] to reference an existing artifact',
    )
  })

  it('throws when a referenced artifact symlink escapes artifactsDir', () => {
    if (!canCreateSymlink()) return

    const artifactsDir = makeArtifactsDir()
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-review-outside-'))
    const outsideFile = path.join(outsideDir, 'metrics.json')
    fs.writeFileSync(outsideFile, 'outside')

    const summary = makeValidSummary()
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: ['metrics.json'] })
    fs.symlinkSync(outsideFile, path.join(artifactsDir, 'metrics.json'))

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.metrics to reference an artifact inside artifactsDir',
    )
  })

  it('throws when a referenced artifact points to a directory', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary()
    writeSummary(artifactsDir, summary)
    writeArtifactDir(artifactsDir, 'metrics.json')
    writeReferencedArtifacts(artifactsDir, summary, { skip: ['metrics.json'] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.metrics to reference an existing artifact file',
    )
  })

  it('throws when summary.json artifacts.svg is an absolute path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { svg: path.join(path.sep, 'tmp', 'render.svg') } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.svg as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.svg to be a relative path or null',
    )
  })

  it('throws when summary.json artifacts.browser_png is an absolute path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { browser_png: path.join(path.sep, 'tmp', 'browser.png') } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.browser_png as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.browser_png to be a relative path or null',
    )
  })

  it('throws when summary.json artifacts.dom_html is an absolute path', () => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { dom_html: path.join(path.sep, 'tmp', 'dom.html') } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts.dom_html as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json artifacts.dom_html to be a relative path or null',
    )
  })

  it('throws when summary.json judge inputs are missing or not an array', () => {
    const artifactsDir = makeArtifactsDir()
    const validSummary = makeValidSummary()
    writeReferencedArtifacts(artifactsDir, validSummary)
    writeSummary(
      artifactsDir,
      makeValidSummary({
        judgeArtifacts: 'render.svg',
      }),
    )

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      'Invalid summary artifact: expected summary.json judge.inputs.artifacts to contain an array',
    )
  })
})
