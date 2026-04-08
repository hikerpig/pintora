import * as fs from 'node:fs'
import { loadCaseRegistry, resolveCaseInput } from './case-registry'

export function resolveHarnessInput(opts: { cwd: string; caseId?: string; inputFile?: string }) {
  if (opts.caseId) {
    const registry = loadCaseRegistry(opts.cwd)
    const item = registry.get(opts.caseId)
    if (!item) throw new Error(`Unknown harness case: ${opts.caseId}`)
    return {
      caseMeta: item,
      inputFile: resolveCaseInput(opts.cwd, opts.caseId),
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
