import { HarnessStatus } from './contracts'

export function statusToExitCode(status: HarnessStatus) {
  if (status === 'suspicious') return 10
  if (status === 'fail') return 20
  return 0
}
