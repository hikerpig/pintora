import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessRenderAscii } from '../rendering/render-ascii'

describe('runHarnessRenderAscii', () => {
  it('renders ascii text and the source text diagram plan from a registry case', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-ascii-'))

    const result = await runHarnessRenderAscii({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      outDir,
    })

    const text = fs.readFileSync(path.join(outDir, 'render.txt'), 'utf8')
    const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'plan.json'), 'utf8'))

    expect(result.status).toBe('ok')
    expect(result.diagramType).toBe('er')
    expect(result.artifacts).toEqual(['render.txt', 'plan.json'])
    expect(text).toContain('PERSON')
    expect(text).toContain('ORDER')
    expect(plan).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      ops: expect.any(Array),
    })
  })

  it('renders the complex ER relationship layout case as visual ASCII', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-er-ascii-'))

    const result = await runHarnessRenderAscii({
      cwd: process.cwd(),
      caseId: 'er.relationship-layout-ascii-01',
      outDir,
    })

    const text = fs.readFileSync(path.join(outDir, 'render.txt'), 'utf8')
    const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'plan.json'), 'utf8'))

    expect(result.status).toBe('ok')
    expect(text).toContain('PERSON')
    expect(text).toContain('ORDER')
    expect(text).toContain('ISA')
    expect(text).toContain('places')
    expect(text).toMatch(/[─│┼┬┴├┤]/)
    expect(plan.ops.some((op: any) => op.type === 'line')).toBe(true)
  })
})
