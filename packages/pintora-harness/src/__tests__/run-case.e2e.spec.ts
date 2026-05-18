import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessCase } from '../orchestration/run-case'

describe('runHarnessCase e2e', () => {
  it('runs a registry case through render, inspect, and summary', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-run-case-'))

    const result = await runHarnessCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir,
      enableCaptureBrowser: false,
    })

    expect(result.status).toBe('ok')
    expect(fs.existsSync(path.join(artifactsDir, 'render.svg'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'findings.json'))).toBe(true)
    expect(fs.existsSync(path.join(artifactsDir, 'summary.json'))).toBe(true)
  })
})
