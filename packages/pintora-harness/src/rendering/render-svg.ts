import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessSource, resolveHarnessInput } from '../cases/read-input'
import { renderHarnessSvg } from './render-adapter'

export async function runHarnessRenderSvg(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outFile: string
}) {
  const resolved = resolveHarnessInput(opts)
  const code = readHarnessSource(resolved.inputFile)
  const svg = await renderHarnessSvg({ code })

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
