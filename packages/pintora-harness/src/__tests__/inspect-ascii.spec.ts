import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessInspectAscii } from '../inspection/inspect-ascii'

describe('runHarnessInspectAscii', () => {
  it('writes ascii metrics and findings for a healthy text plan', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-ascii-inspect-'))
    const textFile = path.join(outDir, 'render.txt')
    const planFile = path.join(outDir, 'plan.json')

    fs.writeFileSync(textFile, ['┌───┐', '│ A │', '└───┘'].join('\n'))
    fs.writeFileSync(
      planFile,
      JSON.stringify({
        width: 5,
        height: 3,
        ops: [
          { type: 'rect', x: 0, y: 0, width: 5, height: 3 },
          { type: 'text', x: 2, y: 1, text: 'A', align: 'center' },
        ],
      }),
    )

    const result = await runHarnessInspectAscii({
      textFile,
      planFile,
      outDir,
    })

    const metrics = JSON.parse(fs.readFileSync(path.join(outDir, 'ascii-metrics.json'), 'utf8'))
    const findings = JSON.parse(fs.readFileSync(path.join(outDir, 'ascii-findings.json'), 'utf8'))

    expect(result.status).toBe('ok')
    expect(metrics).toMatchObject({
      lineCount: 3,
      maxDisplayWidth: 5,
      plan: {
        width: 5,
        height: 3,
        opOutOfBoundsCount: 0,
        textLineConflictCount: 0,
      },
    })
    expect(findings).toEqual([])
  })

  it('reports suspicious findings when plan text overlaps planned line cells', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-ascii-inspect-'))
    const textFile = path.join(outDir, 'render.txt')
    const planFile = path.join(outDir, 'plan.json')

    fs.writeFileSync(textFile, 'A─B\n')
    fs.writeFileSync(
      planFile,
      JSON.stringify({
        width: 3,
        height: 1,
        ops: [
          { type: 'line', from: { x: 0, y: 0 }, to: { x: 2, y: 0 } },
          { type: 'text', x: 1, y: 0, text: 'A' },
        ],
      }),
    )

    const result = await runHarnessInspectAscii({
      textFile,
      planFile,
      outDir,
    })

    const findings = JSON.parse(fs.readFileSync(path.join(outDir, 'ascii-findings.json'), 'utf8'))

    expect(result.status).toBe('suspicious')
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ascii-text-line-conflict',
        }),
      ]),
    )
  })

  it('flags ER ASCII output that falls back to raw relationship text', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-er-inspect-'))
    fs.writeFileSync(path.join(outDir, 'render.txt'), 'CUSTOMER ||--o{ ORDER : places\n')
    fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({ width: 34, height: 1, ops: [] }))

    const result = await runHarnessInspectAscii({
      caseId: 'er.relationship-layout-ascii-01',
      outDir,
    })

    const findings = JSON.parse(fs.readFileSync(path.join(outDir, 'ascii-findings.json'), 'utf8'))

    expect(result.findingCount).toBeGreaterThan(0)
    expect(findings.some((finding: any) => finding.id === 'er-raw-relationship-legend')).toBe(true)
  })
})
