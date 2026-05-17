import { buildTraceRunId, slugifyTraceTask } from '../trace/run-id'

describe('trace run id helpers', () => {
  it('slugifies task names for trace paths', () => {
    expect(slugifyTraceTask('Improve ER label lane spacing!')).toBe('improve-er-label-lane-spacing')
  })

  it('uses run for empty task slugs', () => {
    expect(slugifyTraceTask('!!!')).toBe('run')
  })

  it('builds a UTC timestamped run id', () => {
    const runId = buildTraceRunId('Improve ER label lane spacing!', new Date('2026-05-17T10:52:00.000Z'))

    expect(runId).toBe('20260517-105200-improve-er-label-lane-spacing')
  })
})
