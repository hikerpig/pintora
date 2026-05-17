import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { captureGitState, deriveDirtyState, parseGitBranch, writeGitDiffFile } from '../trace/git-capture'

function makeGitRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-trace-git-'))
  execFileSync('git', ['init', '-b', 'main'], { cwd })
  execFileSync('git', ['config', 'user.email', 'trace@example.com'], { cwd })
  execFileSync('git', ['config', 'user.name', 'Trace Test'], { cwd })
  fs.writeFileSync(path.join(cwd, 'tracked.txt'), 'before\n')
  execFileSync('git', ['add', 'tracked.txt'], { cwd })
  execFileSync('git', ['commit', '-m', 'initial'], { cwd })
  return cwd
}

describe('git trace helpers', () => {
  it('derives dirty state from porcelain status output', () => {
    expect(deriveDirtyState('')).toBe(false)
    expect(deriveDirtyState(' M file.ts\n')).toBe(true)
  })

  it('parses branch output with detached fallback', () => {
    expect(parseGitBranch('main\n')).toBe('main')
    expect(parseGitBranch('')).toBe('detached')
  })

  it('captures branch, sha, dirty state, and short status', () => {
    const cwd = makeGitRepo()
    fs.writeFileSync(path.join(cwd, 'tracked.txt'), 'after\n')

    const state = captureGitState(cwd)

    expect(state.branch).not.toBe('')
    expect(state.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(state.dirty).toBe(true)
    expect(state.status_short).toContain(' M tracked.txt')
  })

  it('writes git diff output to a file', () => {
    const cwd = makeGitRepo()
    fs.writeFileSync(path.join(cwd, 'tracked.txt'), 'after\n')
    const outFile = path.join(cwd, 'trace.diff')

    writeGitDiffFile(cwd, outFile)

    const diff = fs.readFileSync(outFile, 'utf8')
    expect(diff).toContain('diff --git')
    expect(diff).toContain('-before')
    expect(diff).toContain('+after')
  })

  it('includes untracked text files in git diff output', () => {
    const cwd = makeGitRepo()
    fs.writeFileSync(path.join(cwd, 'new-file.txt'), 'untracked content\n')
    const outFile = path.join(cwd, 'trace.diff')

    writeGitDiffFile(cwd, outFile)

    const diff = fs.readFileSync(outFile, 'utf8')
    expect(diff).toContain('new-file.txt')
    expect(diff).toContain('untracked content')
  })
})
