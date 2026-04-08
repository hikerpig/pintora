import path from 'node:path'
import { loadCaseRegistry, resolveCaseInput, resolveHarnessWorkspaceRoot } from '../../harness/case-registry'

describe('harness case registry', () => {
  it('loads a case by id from harness/cases/registry.json', () => {
    const registry = loadCaseRegistry(process.cwd())
    const item = registry.get('er.relationship-spacing-01')

    expect(item?.diagram_type).toBe('er')
    expect(item?.checks).toContain('svg-structure')
  })

  it('resolves the input file to an absolute .pintora path', () => {
    const absPath = resolveCaseInput(process.cwd(), 'er.relationship-spacing-01')
    expect(absPath).toBe(
      path.join(resolveHarnessWorkspaceRoot(process.cwd()), 'harness/cases/er/relationship-spacing-01.pintora'),
    )
  })
})
