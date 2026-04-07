import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadCaseRegistry, resolveHarnessWorkspaceRoot } from './case-registry'

export function resolveHarnessInput(opts: { cwd: string; caseId?: string; inputFile?: string }) {
  if (opts.caseId) {
    const item = loadCaseRegistry(opts.cwd).get(opts.caseId)
    if (!item) throw new Error(`Unknown harness case: ${opts.caseId}`)
    return {
      caseMeta: item,
      inputFile: path.join(resolveHarnessWorkspaceRoot(opts.cwd), 'harness/cases', item.input_file),
    }
  }

  if (!opts.inputFile) throw new Error('Either --case or --input is required')
  return {
    caseMeta: null,
    inputFile: opts.inputFile,
  }
}

export function readHarnessSource(inputFile: string) {
  return fs.readFileSync(inputFile, 'utf8')
}
