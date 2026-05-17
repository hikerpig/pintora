import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { TextDecoder } from 'util'
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
  const trackedDiff = git(cwd, ['diff', '--no-ext-diff'])
  const untrackedDiff = buildUntrackedDiff(cwd)
  fs.writeFileSync(outFile, trackedDiff + untrackedDiff)
}

function buildUntrackedDiff(cwd: string) {
  const output = git(cwd, ['ls-files', '--others', '--exclude-standard', '-z'])
  const files = output.split('\0').filter(Boolean)
  if (files.length === 0) return ''

  return files.map(filePath => renderUntrackedFileDiff(cwd, filePath)).join('')
}

function renderUntrackedFileDiff(cwd: string, filePath: string) {
  const header = [
    `diff --git a/${filePath} b/${filePath}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${filePath}`,
  ]

  const content = readUtf8TextFile(cwd, filePath)
  if (content === null) {
    return `\n${header.join('\n')}\n@@\n[untracked file skipped: binary or unreadable]\n`
  }

  const body = content
    .split('\n')
    .map(line => `+${line}`)
    .join('\n')

  return `\n${header.join('\n')}\n@@\n${body}${content.endsWith('\n') ? '' : '\n\\ No newline at end of file\n'}`
}

function readUtf8TextFile(cwd: string, filePath: string) {
  try {
    const buffer = fs.readFileSync(path.join(cwd, filePath))
    if (buffer.includes(0)) return null
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(buffer))
  } catch {
    return null
  }
}
