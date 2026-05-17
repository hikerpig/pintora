import * as fs from 'node:fs'
import * as path from 'node:path'
import type { HarnessStatus } from '../contracts/harness'
import type { TraceCommandEntry, TraceManifest } from '../trace/trace-contracts'
import { HarnessDecisionEvent, readDecisionEvents } from './decision-observability'

export type RunSuiteCaseLike = {
  caseId: string
  status: HarnessStatus
  summary: string
  captureBrowserTriggered?: boolean
  reviewDecision?: string
}

export type RunSuiteLike = {
  suite?: string
  total?: number
  ok?: number
  suspicious?: number
  fail?: number
  cases?: RunSuiteCaseLike[]
}

export type CaseSummaryLike = {
  case_id: string | null
  diagram_type: string | null
  status: HarnessStatus
  failure_signature?: string | null
  suspected_component?: string | null
  top_findings?: string[]
  next_action?: string
}

export type TraceRunRecord = {
  runDir: string
  runId: string
  manifest: TraceManifest | null
  suite: RunSuiteLike | null
  cases: Array<{
    caseId: string
    status: HarnessStatus
    summaryPath: string | null
    summary: CaseSummaryLike | null
    reviewDecision?: string
  }>
  commands: TraceCommandEntry[]
  decisions: HarnessDecisionEvent[]
  incomplete: boolean
  incompleteReason: string | null
}

export function listTraceRunDirs(runsDir: string) {
  if (!fs.existsSync(runsDir)) return []
  return fs
    .readdirSync(runsDir)
    .map(name => path.join(runsDir, name))
    .filter(item => {
      try {
        return fs.statSync(item).isDirectory()
      } catch {
        return false
      }
    })
    .sort()
}

export function readTraceRunRecord(runDir: string): TraceRunRecord {
  const manifestPath = path.join(runDir, 'manifest.json')
  const manifest = readJsonFile<TraceManifest>(manifestPath)
  const runId = manifest?.run_id || path.basename(runDir)
  const harnessArtifact = manifest?.artifacts?.harness || 'harness/suite.json'
  const suitePath = path.join(runDir, harnessArtifact)
  const suite = readJsonFile<RunSuiteLike>(suitePath)
  const harnessDir = path.dirname(suitePath)
  const cases = (suite?.cases || []).map(item => {
    const summaryPath = item.summary ? path.join(harnessDir, item.summary) : null
    return {
      caseId: item.caseId,
      status: item.status,
      summaryPath,
      summary: summaryPath ? readJsonFile<CaseSummaryLike>(summaryPath) : null,
      reviewDecision: item.reviewDecision,
    }
  })
  const commandsPath = manifest?.artifacts?.commands ? path.join(runDir, manifest.artifacts.commands) : null
  const decisionsPath = manifest?.artifacts?.decisions ? path.join(runDir, manifest.artifacts.decisions) : null
  const incompleteReason =
    manifest?.incomplete_reason || (!manifest ? 'missing manifest.json' : !suite ? 'missing suite.json' : null)

  return {
    runDir,
    runId,
    manifest,
    suite,
    cases,
    commands: readCommandEntries(commandsPath),
    decisions: readDecisionEvents(decisionsPath),
    incomplete: Boolean(incompleteReason),
    incompleteReason,
  }
}

export function readChangedPathsFromDiff(diffFile: string) {
  if (!fs.existsSync(diffFile)) return []
  const paths = new Set<string>()
  const diff = fs.readFileSync(diffFile, 'utf8')
  for (const line of diff.split('\n')) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (match) {
      paths.add(match[2])
      continue
    }
    const untracked = /^--- \/dev\/null\n\+\+\+ b\/(.+)$/m.exec(line)
    if (untracked) paths.add(untracked[1])
  }
  return Array.from(paths).sort()
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

function readCommandEntries(filePath: string | null): TraceCommandEntry[] {
  if (!filePath || !fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line) as TraceCommandEntry]
      } catch {
        return []
      }
    })
}
