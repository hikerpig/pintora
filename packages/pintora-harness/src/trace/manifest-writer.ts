import fs from 'fs'
import path from 'path'
import type { TraceManifest } from './trace-contracts'

export function writeTraceManifest(outFile: string, manifest: TraceManifest) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`)
}
