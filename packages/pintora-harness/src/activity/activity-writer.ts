import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  type ActivityEventData,
  type AgentActivityEvent,
  type AgentConstraintsFile,
} from './activity-contracts'

export const AGENT_EVENTS_FILE = 'agent-events.ndjson'
export const CONSTRAINTS_FILE = 'constraints.json'
export const AGENT_SUMMARY_FILE = 'agent-summary.md'
export const CONSTRAINT_GAPS_FILE = 'constraint-gaps.md'

export function initializeAgentActivityFiles(runDir: string) {
  fs.mkdirSync(runDir, { recursive: true })
  writeFileIfMissing(path.join(runDir, AGENT_EVENTS_FILE), '')
  writeFileIfMissing(
    path.join(runDir, CONSTRAINTS_FILE),
    `${JSON.stringify({ schema_version: 1, constraints: [] } satisfies AgentConstraintsFile, null, 2)}\n`,
  )
  writeFileIfMissing(path.join(runDir, AGENT_SUMMARY_FILE), '# Agent Summary\n\nNo activity events recorded yet.\n')
  writeFileIfMissing(path.join(runDir, CONSTRAINT_GAPS_FILE), '# Constraint Gaps\n\nNo constraint gaps recorded yet.\n')
}

export function appendAgentActivityEvent(runDir: string, event: AgentActivityEvent) {
  fs.mkdirSync(runDir, { recursive: true })
  fs.appendFileSync(path.join(runDir, AGENT_EVENTS_FILE), `${JSON.stringify(event)}\n`)
}

export type RunHarnessTraceAgentEventOptions = {
  runDir: string
  kind: string
  phase: string
  summary: string
  data: ActivityEventData
}

export function buildAgentActivityEvent(opts: Omit<RunHarnessTraceAgentEventOptions, 'runDir'>): AgentActivityEvent {
  const kind = assertActivityEventKind(opts.kind)
  const phase = assertActivityEventPhase(opts.phase)
  const summary = opts.summary.trim()
  if (!summary) throw new Error('Activity event summary is required')

  if (kind === 'constraint_check') {
    const status = opts.data.status
    if (typeof status === 'string') assertConstraintStatus(status)
  }

  return {
    schema_version: 1,
    ts: new Date().toISOString(),
    kind,
    phase,
    summary,
    data: opts.data,
  }
}

export async function runHarnessTraceAgentEvent(opts: RunHarnessTraceAgentEventOptions) {
  const event = buildAgentActivityEvent(opts)
  initializeAgentActivityFiles(opts.runDir)
  appendAgentActivityEvent(opts.runDir, event)

  return {
    status: 'completed' as const,
    event: AGENT_EVENTS_FILE,
  }
}

function writeFileIfMissing(filePath: string, content: string) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content)
}
