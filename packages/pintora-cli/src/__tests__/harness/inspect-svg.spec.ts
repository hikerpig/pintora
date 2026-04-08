import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessInspectSvg } from '../../harness/inspect-svg'

describe('runHarnessInspectSvg', () => {
  it('writes metrics.json and findings.json for a healthy ER case', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
    const svg = path.join(tmpDir, 'render.svg')
    fs.writeFileSync(
      svg,
      '<svg viewBox="0 0 200 100"><rect x="10" y="10" width="180" height="80" /><text x="30" y="40">PERSON</text></svg>',
    )

    const result = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile: svg,
      caseId: 'er.relationship-spacing-01',
      outDir: tmpDir,
    })

    expect(result.status).toBe('ok')
    expect(fs.existsSync(path.join(tmpDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'findings.json'))).toBe(true)
  })

  it('returns suspicious when text is too close to the viewBox edge', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
    const svg = path.join(tmpDir, 'render.svg')
    fs.writeFileSync(svg, '<svg viewBox="0 0 120 40"><text x="1" y="10">edge</text></svg>')

    const result = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile: svg,
      caseId: 'sequence.lifeline-label-separation-01',
      outDir: tmpDir,
    })

    expect(result.status).toBe('suspicious')
    expect(result.findingCount).toBeGreaterThan(0)
  })

  it('treats svg width and height as a fallback viewport when viewBox is absent', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-inspect-'))
    const svg = path.join(tmpDir, 'render.svg')
    fs.writeFileSync(svg, '<svg width="200" height="100"><text x="30" y="40">PERSON</text></svg>')

    const result = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile: svg,
      caseId: 'er.relationship-spacing-01',
      outDir: tmpDir,
    })

    expect(result.status).toBe('ok')
  })
})
