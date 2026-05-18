import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import chokidar from 'chokidar'
import fg from 'fast-glob'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { startObservation } from '@langfuse/tracing'

type JsonObj = Record<string, unknown>

const repoRoot = process.cwd()
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
const sessionsDir = path.join(codexHome, 'sessions')

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
})

const secretKeyPattern = /(api[_-]?key|token|secret|password|authorization|cookie)/i

function safeJson(line: string): JsonObj {
  try {
    return JSON.parse(line) as JsonObj
  } catch {
    return {
      type: 'raw_line',
      text: line.slice(0, 4000),
    }
  }
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[MaxDepth]'

  if (Array.isArray(value)) {
    return value.map(item => redact(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    const out: JsonObj = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = secretKeyPattern.test(key) ? '[Redacted]' : redact(val, depth + 1)
    }
    return out
  }

  if (typeof value === 'string' && value.length > 12000) {
    return `${value.slice(0, 12000)}...[Truncated]`
  }

  return value
}

function eventType(ev: JsonObj) {
  const msg = ev.msg
  const msgType = msg && typeof msg === 'object' && 'type' in msg ? msg.type : undefined

  return String(ev.type || ev.item_type || ev.event || ev.kind || msgType || 'codex_event')
}

function normalizeOutput(ev: JsonObj) {
  const typ = eventType(ev)

  if (typ.includes('assistant')) {
    return ev.text || ev.message || ev.content || null
  }

  if (typ.includes('tool') || typ.includes('command') || typ.includes('exec')) {
    return {
      tool: ev.tool || ev.name,
      status: ev.status,
      exitCode: ev.exit_code ?? ev.exitCode,
      stdoutTail: typeof ev.stdout === 'string' ? ev.stdout.slice(-4000) : undefined,
      stderrTail: typeof ev.stderr === 'string' ? ev.stderr.slice(-4000) : undefined,
    }
  }

  if (typ.includes('patch') || typ.includes('edit')) {
    return {
      files: ev.files || ev.path || ev.paths,
      status: ev.status,
    }
  }

  return null
}

function sessionIdFromFile(file: string) {
  return path
    .basename(file)
    .replace(/^rollout-/, '')
    .replace(/\.jsonl$/, '')
}

function isRolloutFile(file: string) {
  return /^rollout-.*\.jsonl$/.test(path.basename(file))
}

async function latestRolloutFile() {
  const files = await fg('**/rollout-*.jsonl', {
    cwd: sessionsDir,
    absolute: true,
    onlyFiles: true,
  })

  const withStats = await Promise.all(
    files.map(async file => ({
      file,
      mtimeMs: (await fs.promises.stat(file)).mtimeMs,
    })),
  )

  return withStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file ?? null
}

async function readRange(file: string, start: number, end: number) {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    const stream = fs.createReadStream(file, { encoding: 'utf8', start, end })

    stream.on('data', part => {
      data += part
    })
    stream.on('error', reject)
    stream.on('end', () => resolve(data))
  })
}

async function tailJsonl(file: string) {
  const sessionId = sessionIdFromFile(file)
  let offset = 0
  let pending = ''
  let closed = false
  let consuming = Promise.resolve()

  const root = startObservation(
    'codex.session',
    {
      input: {
        repoRoot,
        codexHome,
        sessionFile: file,
        sessionId,
      },
      metadata: {
        repo: path.basename(repoRoot),
        source: 'codex-jsonl-tail',
      },
      sessionId,
      userId: os.userInfo().username,
      tags: ['codex', 'pintora', 'agent-trace'],
    },
    { asType: 'span' },
  )

  function observeLine(line: string, partial = false) {
    const trimmed = line.trim()
    if (!trimmed) return

    const ev = safeJson(trimmed)
    const typ = eventType(ev)

    root
      .startObservation(
        `codex.${typ}`,
        {
          input: redact(ev),
          metadata: {
            sessionFile: file,
            sessionId,
            type: typ,
            partial,
          },
        },
        { asType: 'span' },
      )
      .update({
        output: redact(normalizeOutput(ev)),
      })
      .end()
  }

  async function consumeNewBytes() {
    if (closed) return

    const stat = await fs.promises.stat(file).catch(() => null)
    if (!stat || stat.size <= offset) return

    const start = offset
    const end = stat.size - 1
    offset = stat.size

    pending += await readRange(file, start, end)

    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''

    for (const line of lines) {
      observeLine(line)
    }
  }

  function queueConsume() {
    consuming = consuming.catch(() => {}).then(consumeNewBytes)
    consuming.catch(err => {
      console.error('[codex-observe] consume failed:', err)
    })
  }

  await consumeNewBytes()

  const watcher = chokidar.watch(file, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  })

  watcher.on('change', queueConsume)

  async function shutdown(status: string) {
    if (closed) return

    closed = true
    await consuming
    await watcher.close()

    if (pending.trim()) {
      observeLine(pending, true)
    }

    root
      .update({
        output: {
          status,
          sessionFile: file,
        },
      })
      .end()

    await sdk.shutdown()
  }

  process.once('SIGINT', async () => {
    await shutdown('interrupted')
    process.exit(0)
  })

  process.once('SIGTERM', async () => {
    await shutdown('terminated')
    process.exit(0)
  })

  console.log(`[codex-observe] observing ${file}`)
}

async function observeLatestOrWait() {
  await sdk.start()

  const latest = await latestRolloutFile()
  if (latest) {
    await tailJsonl(latest)
    return
  }

  console.log(`[codex-observe] no rollout file yet, watching ${sessionsDir}`)

  const watcher = chokidar.watch(path.join(sessionsDir, '**/rollout-*.jsonl'), {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  })

  watcher.on('add', async file => {
    if (!isRolloutFile(file)) return

    await watcher.close()
    await tailJsonl(file)
  })
}

observeLatestOrWait().catch(async err => {
  console.error('[codex-observe] fatal:', err)
  await sdk.shutdown().catch(() => {})
  process.exit(1)
})
