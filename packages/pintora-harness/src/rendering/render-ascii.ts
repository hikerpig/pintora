import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessSource, resolveHarnessInput } from '../cases/read-input'
import { renderHarnessAscii } from './render-adapter'

export const ASCII_RENDER_ARTIFACTS = {
  text: 'render.txt',
  plan: 'plan.json',
}

export async function runHarnessRenderAscii(opts: {
  cwd: string
  caseId?: string
  inputFile?: string
  outDir: string
}) {
  const resolved = resolveHarnessInput(opts)
  const code = readHarnessSource(resolved.inputFile)
  const { text, plan } = await renderHarnessAscii({ code })

  fs.mkdirSync(opts.outDir, { recursive: true })
  fs.writeFileSync(path.join(opts.outDir, ASCII_RENDER_ARTIFACTS.text), text)
  fs.writeFileSync(path.join(opts.outDir, ASCII_RENDER_ARTIFACTS.plan), JSON.stringify(plan, null, 2))

  return {
    status: 'ok' as const,
    diagramType: resolved.caseMeta?.diagram_type ?? inferDiagramType(code),
    artifacts: [ASCII_RENDER_ARTIFACTS.text, ASCII_RENDER_ARTIFACTS.plan],
  }
}

function inferDiagramType(code: string) {
  if (/^\s*erDiagram/m.test(code)) return 'er'
  if (/^\s*sequenceDiagram/m.test(code)) return 'sequence'
  return 'unknown'
}
