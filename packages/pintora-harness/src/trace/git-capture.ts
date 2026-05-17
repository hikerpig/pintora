import fs from 'fs'
import { execFileSync } from 'child_process'
import type { TraceGitState } from './trace-contracts'

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export function deriveDirtyState(statusOutput: string) {
  return statusOutput.trim().length > 0
}

export function parseGitBranch(branchOutput: string) {
  const branch = branchOutput.trim()
  return branch || 'detached'
}

export function captureGitState(cwd: string): TraceGitState {
  const branch = parseGitBranch(git(cwd, ['branch', '--show-current']))
  const commit = git(cwd, ['rev-parse', 'HEAD']).trim()
  const status = git(cwd, ['status', '--short'])

  return {
    branch,
    commit,
    dirty: deriveDirtyState(status),
    status_short: status,
  }
}

export function writeGitDiffFile(cwd: string, outFile: string) {
  const diff = git(cwd, ['diff', '--no-ext-diff'])
  fs.writeFileSync(outFile, diff)
}
