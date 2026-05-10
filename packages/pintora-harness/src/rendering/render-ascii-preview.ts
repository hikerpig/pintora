import * as fs from 'node:fs'
import * as path from 'node:path'
import { renderAsciiPreviewSvg } from './ascii-preview-svg'

export async function runHarnessRenderAsciiPreview(opts: { textFile: string; outFile: string }) {
  const text = fs.readFileSync(opts.textFile, 'utf8')
  const svg = renderAsciiPreviewSvg(text)

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, svg)

  return {
    status: 'ok' as const,
    artifact: path.basename(opts.outFile),
  }
}
