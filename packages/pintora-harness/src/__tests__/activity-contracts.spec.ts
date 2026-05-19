import {
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  parseActivityEventData,
} from '../activity/activity-contracts'

describe('activity contracts', () => {
  it('accepts supported event kinds, phases, and constraint statuses', () => {
    expect(assertActivityEventKind('constraint_check')).toBe('constraint_check')
    expect(assertActivityEventKind('agent_plan')).toBe('agent_plan')
    expect(assertActivityEventPhase('context')).toBe('context')
    expect(assertActivityEventPhase('verification')).toBe('verification')
    expect(assertConstraintStatus('observed')).toBe('observed')
    expect(assertConstraintStatus('conflicted')).toBe('conflicted')
  })

  it('rejects unsupported event kinds, phases, and constraint statuses', () => {
    expect(() => assertActivityEventKind('raw_transcript')).toThrow('Invalid activity event kind')
    expect(() => assertActivityEventPhase('debugging')).toThrow('Invalid activity event phase')
    expect(() => assertConstraintStatus('passed')).toThrow('Invalid constraint status')
  })

  it('parses JSON object event data', () => {
    expect(parseActivityEventData('{"constraint_id":"pnpm-only","status":"observed"}')).toEqual({
      constraint_id: 'pnpm-only',
      status: 'observed',
    })
  })

  it('rejects malformed or non-object event data', () => {
    expect(() => parseActivityEventData('{')).toThrow('Invalid activity event data JSON')
    expect(() => parseActivityEventData('"text"')).toThrow('Activity event data must be a JSON object')
    expect(() => parseActivityEventData('[]')).toThrow('Activity event data must be a JSON object')
  })
})
