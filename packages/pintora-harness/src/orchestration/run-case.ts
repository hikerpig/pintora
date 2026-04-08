import { executeHarnessCase } from './case-runner'
import type { RunCaseOptions } from './run-contracts'

export function runHarnessCase(opts: RunCaseOptions) {
  return executeHarnessCase(opts)
}
