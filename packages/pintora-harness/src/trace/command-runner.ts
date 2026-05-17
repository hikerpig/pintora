import { spawn } from 'child_process'
import type { TraceCommandEntry, TraceCommandPhase } from './trace-contracts'

export type RunTraceCommandOptions = {
  cwd: string
  cmd: string
  args?: string[]
  phase: TraceCommandPhase
  summary: string
  maxExcerptLength?: number
  artifactRefs?: string[]
}

const DEFAULT_MAX_EXCERPT_LENGTH = 12_000

function appendBounded(current: string, chunk: Buffer | string, maxLength: number) {
  const next = current + chunk.toString()
  if (next.length <= maxLength) return next
  return next.slice(next.length - maxLength)
}

function formatCommand(cmd: string, args: string[]) {
  return [cmd, ...args].join(' ')
}

export function runTraceCommand(options: RunTraceCommandOptions): Promise<TraceCommandEntry> {
  const args = options.args ?? []
  const maxExcerptLength = options.maxExcerptLength ?? DEFAULT_MAX_EXCERPT_LENGTH
  const startedAt = new Date()
  const startedTime = Date.now()

  return new Promise(resolve => {
    let stdoutExcerpt = ''
    let stderrExcerpt = ''
    let resolved = false

    const finish = (exitCode: number) => {
      if (resolved) return
      resolved = true
      const entry: TraceCommandEntry = {
        schema_version: 1,
        ts: startedAt.toISOString(),
        cmd: formatCommand(options.cmd, args),
        cwd: options.cwd,
        exit_code: exitCode,
        duration_ms: Date.now() - startedTime,
        phase: options.phase,
        summary: options.summary,
        ...(stdoutExcerpt ? { stdout_excerpt: stdoutExcerpt } : {}),
        ...(stderrExcerpt ? { stderr_excerpt: stderrExcerpt } : {}),
        ...(options.artifactRefs ? { artifact_refs: options.artifactRefs } : {}),
      }
      resolve(entry)
    }

    const child = spawn(options.cmd, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    child.stdout.on('data', chunk => {
      stdoutExcerpt = appendBounded(stdoutExcerpt, chunk, maxExcerptLength)
    })
    child.stderr.on('data', chunk => {
      stderrExcerpt = appendBounded(stderrExcerpt, chunk, maxExcerptLength)
    })
    child.on('error', error => {
      stderrExcerpt = appendBounded(stderrExcerpt, error.message, maxExcerptLength)
      finish(-1)
    })
    child.on('close', exitCode => {
      finish(exitCode ?? -1)
    })
  })
}
