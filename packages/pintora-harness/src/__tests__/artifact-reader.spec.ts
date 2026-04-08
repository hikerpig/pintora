import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readHarnessArtifacts } from '../summary/artifact-reader'

describe('readHarnessArtifacts', () => {
  it('reads required metrics and findings and records optional artifacts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    const metrics = { viewBox: { x: 0, y: 0, width: 100, height: 80 } }
    const findings = [{ id: 'finding-1', message: 'unexpected shape' }]
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(metrics))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify(findings))
    fs.writeFileSync(path.join(dir, 'render.svg'), '<svg></svg>')
    fs.writeFileSync(path.join(dir, 'browser.png'), 'png')

    const result = readHarnessArtifacts({ artifactsDir: dir })

    expect(result.metrics).toEqual(metrics)
    expect(result.findings).toEqual(findings)
    expect(result.artifacts.metrics).toBe('metrics.json')
    expect(result.artifacts.findings).toBe('findings.json')
    expect(result.artifacts.svg).toBe('render.svg')
    expect(result.artifacts.browser_png).toBe('browser.png')
  })

  it('returns null for missing optional artifacts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({}))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify([]))

    const result = readHarnessArtifacts({ artifactsDir: dir })

    expect(result.artifacts.svg).toBeNull()
    expect(result.artifacts.png).toBeNull()
    expect(result.artifacts.browser_png).toBeNull()
    expect(result.artifacts.dom_html).toBeNull()
  })

  it('throws when metrics.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify([]))

    expect(() => readHarnessArtifacts({ artifactsDir: dir })).toThrow('Missing required artifact: metrics.json')
  })

  it('throws when findings.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({}))

    expect(() => readHarnessArtifacts({ artifactsDir: dir })).toThrow('Missing required artifact: findings.json')
  })

  it('throws when findings.json does not contain an array', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({}))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify({ message: 'not an array' }))

    expect(() => readHarnessArtifacts({ artifactsDir: dir })).toThrow(
      'Invalid findings artifact: expected findings.json to contain an array',
    )
  })

  it('throws when metrics.json does not contain an object', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-summary-artifacts-'))
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify([]))
    fs.writeFileSync(path.join(dir, 'findings.json'), JSON.stringify([]))

    expect(() => readHarnessArtifacts({ artifactsDir: dir })).toThrow(
      'Invalid metrics artifact: expected metrics.json to contain an object',
    )
  })
})
