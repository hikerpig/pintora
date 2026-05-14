import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { buildHarnessReviewPayload } from '../review/review-payload'
import { makeTempDir, writeJson } from '../test-helpers/harness'

function makeArtifactsDir() {
  return makeTempDir('pintora-harness-review-payload-')
}

function makeValidSummary(
  overrides: {
    run_id?: unknown
    case_id?: unknown
    diagram_type?: unknown
    status?: unknown
    next_action?: unknown
    top_findings?: unknown
    artifacts?: Record<string, unknown>
    judgeArtifacts?: unknown
  } = {},
) {
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
  writeJson(path.join(artifactsDir, 'summary.json'), summary)
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

  it.each([
    [
      'status',
      { status: 'broken' },
      'Invalid summary artifact: expected summary.json status to be one of ok, suspicious, fail',
    ],
    [
      'next_action',
      { next_action: 'wait' },
      'Invalid summary artifact: expected summary.json next_action to be one of done, capture_browser, human_review_or_visual_judge, repair_and_rerun',
    ],
    [
      'top_findings',
      { top_findings: ['ok', 123] },
      'Invalid summary artifact: expected summary.json top_findings to contain an array of strings',
    ],
    [
      'judge.inputs.artifacts',
      { judgeArtifacts: 'render.svg' },
      'Invalid summary artifact: expected summary.json judge.inputs.artifacts to contain an array',
    ],
  ])('throws when summary.json %s is invalid', (_name, overrides, expectedMessage) => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary(overrides)
    writeReferencedArtifacts(artifactsDir, makeValidSummary())
    writeSummary(artifactsDir, summary)

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(expectedMessage)
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

  const requiredArtifactPathCases: Array<[string, Record<string, string>, 'metrics' | 'findings']> = [
    ['artifacts.metrics absolute path', { metrics: path.join(path.sep, 'tmp', 'metrics.json') }, 'metrics'],
    ['artifacts.findings path traversal', { findings: '../findings.json' }, 'findings'],
    ['artifacts.metrics Windows drive path', { metrics: 'C:\\tmp\\metrics.json' }, 'metrics'],
    ['artifacts.findings UNC path', { findings: '\\\\server\\share\\findings.json' }, 'findings'],
  ]

  it.each(requiredArtifactPathCases)('throws when summary.json %s is invalid', (_name, artifacts, artifactKey) => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [summary.artifacts[artifactKey] as string] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      `Invalid summary artifact: expected summary.json artifacts.${artifactKey} to be a relative path`,
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
    const summary = makeValidSummary({
      judgeArtifacts: ['render.svg', 'browser.png', 'findings.json', 'missing/dom.html'],
    })
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

  it.each([
    ['svg', path.join(path.sep, 'tmp', 'render.svg')],
    ['browser_png', path.join(path.sep, 'tmp', 'browser.png')],
    ['dom_html', path.join(path.sep, 'tmp', 'dom.html')],
  ])('throws when summary.json artifacts.%s is an absolute path', (artifactKey, artifactPath) => {
    const artifactsDir = makeArtifactsDir()
    const summary = makeValidSummary({ artifacts: { [artifactKey]: artifactPath } })
    writeSummary(artifactsDir, summary)
    writeReferencedArtifacts(artifactsDir, summary, { skip: [artifactPath] })

    expect(() => buildHarnessReviewPayload({ artifactsDir })).toThrow(
      `Invalid summary artifact: expected summary.json artifacts.${artifactKey} to be a relative path or null`,
    )
  })
})
