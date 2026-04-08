import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessInspectSvg } from '../../harness/inspect-svg'
import { runHarnessRenderSvg } from '../../harness/render-svg'

describe('phase-1 harness e2e', () => {
  it('renders and inspects a registry case with machine-readable artifacts', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-e2e-'))
    const svgFile = path.join(outDir, 'render.svg')

    await runHarnessRenderSvg({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outFile: svgFile,
    })

    const summary = await runHarnessInspectSvg({
      cwd: process.cwd(),
      svgFile,
      caseId: 'er.relationship-spacing-01',
      outDir,
    })

    expect(summary.artifacts).toEqual(['metrics.json', 'findings.json'])
    expect(fs.existsSync(path.join(outDir, 'metrics.json'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'findings.json'))).toBe(true)
  })
})
