import * as fs from 'node:fs'
import * as path from 'node:path'
import { SVG_MIME_TYPE } from '../const'
import { render } from '../render'
import { readHarnessSource, resolveHarnessInput } from './read-input'

export async function runHarnessRenderSvg(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outFile: string
}) {
  const resolved = resolveHarnessInput(opts)
  const code = readHarnessSource(resolved.inputFile)
  const svg = (await render({
    code,
    mimeType: SVG_MIME_TYPE,
    renderInSubprocess: false,
  })) as string

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, svg)

  return {
    status: 'ok' as const,
    diagramType: resolved.caseMeta?.diagram_type ?? inferDiagramType(code),
    artifact: path.basename(opts.outFile),
  }
}

function inferDiagramType(code: string) {
  if (/^\s*erDiagram/m.test(code)) return 'er'
  if (/^\s*sequenceDiagram/m.test(code)) return 'sequence'
  return 'unknown'
}
