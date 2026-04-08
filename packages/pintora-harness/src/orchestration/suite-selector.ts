import { loadCaseRegistry } from '../cases/case-registry'

const SMOKE_CASE_IDS = ['er.relationship-spacing-01', 'sequence.lifeline-label-separation-01'] as const

export function resolveSuiteCaseIds(opts: { cwd: string; suite: 'smoke' | 'all' | string }) {
  if (opts.suite === 'smoke') return [...SMOKE_CASE_IDS]

  if (opts.suite === 'all') {
    return Array.from(loadCaseRegistry(opts.cwd).keys()).sort()
  }

  throw new Error(`Unknown harness suite: ${opts.suite}`)
}
