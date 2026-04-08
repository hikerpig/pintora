import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { resolveHarnessWorkspaceRoot } from '../../harness/case-registry'
import { runHarnessRenderSvg } from '../../harness/render-svg'

describe('runHarnessRenderSvg', () => {
  it('renders svg from a registry case into the target file', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-'))
    const outFile = path.join(outDir, 'render.svg')

    const result = await runHarnessRenderSvg({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.diagramType).toBe('er')
    expect(fs.readFileSync(outFile, 'utf8')).toContain('<svg')
  })

  it('accepts --input when no case id is provided', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-'))
    const outFile = path.join(outDir, 'render.svg')
    const inputFile = path.join(
      resolveHarnessWorkspaceRoot(process.cwd()),
      'harness/cases/sequence/lifeline-label-separation-01.pintora',
    )

    const result = await runHarnessRenderSvg({
      cwd: process.cwd(),
      inputFile,
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.diagramType).toBe('sequence')
  })
})
