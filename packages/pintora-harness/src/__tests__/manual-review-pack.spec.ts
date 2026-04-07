import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { manualReviewPackAdapter } from '../review/adapters/manual-review-pack'
import { noopReviewAdapter } from '../review/adapters/noop'
import type { HarnessReviewPayload } from '../review/review-contracts'

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-review-adapter-'))
}

function canCreateSymlink() {
  const dir = makeTempDir()
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

function makePayload(): HarnessReviewPayload {
  return {
    run_id: 'run-123',
    case_id: 'case-123',
    diagram_type: 'sequence',
    status: 'suspicious',
    next_action: 'human_review_or_visual_judge',
    top_findings: ['layout overlap', 'text collision'],
    artifacts: {
      svg: 'render.svg',
      browser_png: 'browser.png',
      dom_html: 'dom.html',
      metrics: 'metrics.json',
      findings: 'findings.json',
      summary: 'summary.json',
    },
    judge_inputs: ['render.svg', 'browser.png', 'dom.html', 'findings.json'],
  }
}

describe('manualReviewPackAdapter', () => {
  it('creates review-pack payload and README files by default', async () => {
    const artifactsDir = makeTempDir()
    const result = await manualReviewPackAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      payload: makePayload(),
    })

    const packDir = path.join(artifactsDir, 'review-pack')
    expect(fs.existsSync(path.join(packDir, 'payload.json'))).toBe(true)
    expect(fs.existsSync(path.join(packDir, 'README.md'))).toBe(true)
    expect(JSON.parse(fs.readFileSync(path.join(packDir, 'payload.json'), 'utf8'))).toEqual(makePayload())
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain(
      'Next task: make a review judgment, not another pipeline run.',
    )
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('## Judge inputs')
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('- findings.json')
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('- dom.html')
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('Status: suspicious')
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain(
      'Next action: human_review_or_visual_judge',
    )
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('layout overlap')
    expect(fs.readFileSync(path.join(packDir, 'README.md'), 'utf8')).toContain('browser.png')
    expect(result).toEqual({
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

  it('creates the default review-pack correctly when artifactsDir is relative', async () => {
    const originalCwd = process.cwd()
    const workspaceDir = makeTempDir()
    const artifactsDir = path.join('tmp-artifacts', 'relative-case')

    try {
      process.chdir(workspaceDir)
      fs.mkdirSync(artifactsDir, { recursive: true })

      const result = await manualReviewPackAdapter.run({
        artifactsDir,
        outFile: path.join(artifactsDir, 'out.json'),
        payload: makePayload(),
      })

      expect(fs.existsSync(path.join(workspaceDir, artifactsDir, 'review-pack', 'payload.json'))).toBe(true)
      expect(fs.existsSync(path.join(workspaceDir, artifactsDir, 'review-pack', 'README.md'))).toBe(true)
      expect(result.artifacts.pack_dir).toBe('review-pack')
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('honors a custom packDir', async () => {
    const artifactsDir = makeTempDir()
    const packDir = path.join(artifactsDir, 'custom-pack')
    const result = await manualReviewPackAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      packDir,
      payload: makePayload(),
    })

    expect(fs.existsSync(path.join(packDir, 'payload.json'))).toBe(true)
    expect(fs.existsSync(path.join(packDir, 'README.md'))).toBe(true)
    expect(result.artifacts.pack_dir).toBe('custom-pack')
  })

  it('resolves a relative custom packDir inside artifactsDir', async () => {
    const artifactsDir = makeTempDir()
    const result = await manualReviewPackAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      packDir: 'relative-pack',
      payload: makePayload(),
    })

    expect(fs.existsSync(path.join(artifactsDir, 'relative-pack', 'payload.json'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'relative-pack', 'README.md'))).toBe(true)
    expect(result.artifacts.pack_dir).toBe('relative-pack')
  })

  it('rejects a custom packDir outside artifactsDir', async () => {
    const artifactsDir = makeTempDir()
    const packDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-outside-')), 'review-pack')

    await expect(
      manualReviewPackAdapter.run({
        artifactsDir,
        outFile: path.join(artifactsDir, 'out.json'),
        packDir,
        payload: makePayload(),
      }),
    ).rejects.toThrow(`Review pack directory must be inside artifactsDir: ${packDir}`)
  })

  it('rejects a custom packDir that escapes through a symlinked parent', async () => {
    if (!canCreateSymlink()) return

    const artifactsDir = makeTempDir()
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-outside-'))
    const linkPath = path.join(artifactsDir, 'link-out')
    fs.symlinkSync(outsideDir, linkPath)

    await expect(
      manualReviewPackAdapter.run({
        artifactsDir,
        outFile: path.join(artifactsDir, 'out.json'),
        packDir: path.join(linkPath, 'review-pack'),
        payload: makePayload(),
      }),
    ).rejects.toThrow(`Review pack directory must be inside artifactsDir: ${path.join(linkPath, 'review-pack')}`)
  })
})

describe('noopReviewAdapter', () => {
  it('does not create a review-pack directory by default', async () => {
    const artifactsDir = makeTempDir()
    const result = await noopReviewAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      payload: makePayload(),
    })

    expect(fs.existsSync(path.join(artifactsDir, 'review-pack'))).toBe(false)
    expect(result).toEqual({
      adapter: 'noop',
      status: 'completed',
      verdict: 'inconclusive',
      confidence: null,
      summary: 'no review adapter work was performed',
      artifacts: {},
    })
  })

  it('writes payload.json when a packDir is provided', async () => {
    const artifactsDir = makeTempDir()
    const packDir = path.join(artifactsDir, 'noop-pack')
    const result = await noopReviewAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      packDir,
      payload: makePayload(),
    })

    expect(JSON.parse(fs.readFileSync(path.join(packDir, 'payload.json'), 'utf8'))).toEqual(makePayload())
    expect(result.artifacts.pack_dir).toBe('noop-pack')
  })

  it('resolves a relative custom packDir inside artifactsDir', async () => {
    const artifactsDir = makeTempDir()
    const result = await noopReviewAdapter.run({
      artifactsDir,
      outFile: path.join(artifactsDir, 'out.json'),
      packDir: 'relative-noop-pack',
      payload: makePayload(),
    })

    expect(JSON.parse(fs.readFileSync(path.join(artifactsDir, 'relative-noop-pack', 'payload.json'), 'utf8'))).toEqual(
      makePayload(),
    )
    expect(result.artifacts.pack_dir).toBe('relative-noop-pack')
  })

  it('rejects a custom packDir outside artifactsDir', async () => {
    const artifactsDir = makeTempDir()
    const packDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-outside-')), 'noop-pack')

    await expect(
      noopReviewAdapter.run({
        artifactsDir,
        outFile: path.join(artifactsDir, 'out.json'),
        packDir,
        payload: makePayload(),
      }),
    ).rejects.toThrow(`Review pack directory must be inside artifactsDir: ${packDir}`)
  })

  it('rejects a custom packDir that escapes through a symlinked parent', async () => {
    if (!canCreateSymlink()) return

    const artifactsDir = makeTempDir()
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-outside-'))
    const linkPath = path.join(artifactsDir, 'link-out')
    fs.symlinkSync(outsideDir, linkPath)

    await expect(
      noopReviewAdapter.run({
        artifactsDir,
        outFile: path.join(artifactsDir, 'out.json'),
        packDir: path.join(linkPath, 'noop-pack'),
        payload: makePayload(),
      }),
    ).rejects.toThrow(`Review pack directory must be inside artifactsDir: ${path.join(linkPath, 'noop-pack')}`)
  })
})
