import { resolveSuiteCaseIds } from '../orchestration/suite-selector'

describe('resolveSuiteCaseIds', () => {
  it('maps smoke to a stable subset of registry cases', () => {
    const caseIds = resolveSuiteCaseIds({
      cwd: process.cwd(),
      suite: 'smoke',
    })

    expect(caseIds).toEqual([
      'er.relationship-spacing-01',
      'sequence.lifeline-label-separation-01',
    ])
  })

  it('maps all to every registry case id', () => {
    const caseIds = resolveSuiteCaseIds({
      cwd: process.cwd(),
      suite: 'all',
    })

    expect(caseIds).toContain('er.relationship-spacing-01')
    expect(caseIds).toContain('sequence.lifeline-label-separation-01')
    expect(caseIds.length).toBeGreaterThanOrEqual(2)
  })

  it('throws for an unknown suite name', () => {
    expect(() =>
      resolveSuiteCaseIds({
        cwd: process.cwd(),
        suite: 'unknown',
      }),
    ).toThrow('Unknown harness suite: unknown')
  })
})
