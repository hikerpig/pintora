import { HarnessStatus } from './contracts/harness'

export function statusToExitCode(status: HarnessStatus) {
  if (status === 'suspicious') return 10
  if (status === 'fail') return 20
  return 0
}

export function deriveSuiteStatus(counts: { fail: number; suspicious: number }): HarnessStatus {
  if (counts.fail > 0) return 'fail'
  if (counts.suspicious > 0) return 'suspicious'
  return 'ok'
}
