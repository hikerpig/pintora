import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessRenderAsciiPreview } from '../rendering/render-ascii-preview'

describe('runHarnessRenderAsciiPreview', () => {
  it('renders a deterministic svg preview from ascii text', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-ascii-preview-'))
    const textFile = path.join(outDir, 'render.txt')
    const outFile = path.join(outDir, 'ascii-preview.svg')

    fs.writeFileSync(textFile, ['┌───┐', '│ A │', '└───┘'].join('\n'))

    const result = await runHarnessRenderAsciiPreview({
      textFile,
      outFile,
    })

    const svg = fs.readFileSync(outFile, 'utf8')

    expect(result.status).toBe('ok')
    expect(result.artifact).toBe('ascii-preview.svg')
    expect(svg).toContain('<svg')
    expect(svg).toContain('xml:space="preserve"')
    expect(svg).toContain('<tspan')
    expect(svg).toContain('┌───┐')
  })
})
