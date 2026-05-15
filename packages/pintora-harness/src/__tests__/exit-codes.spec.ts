import { statusToExitCode } from '../exit-codes'

describe('statusToExitCode', () => {
  it.each([
    ['ok', 0],
    ['suspicious', 10],
    ['fail', 20],
  ])('maps %s to %i', (status, expected) => {
    expect(statusToExitCode(status as 'ok' | 'suspicious' | 'fail')).toBe(expected)
  })
})
