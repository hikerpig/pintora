import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AgentActivityEvent, AgentConstraintsFile } from './activity-contracts'
import { AGENT_EVENTS_FILE, CONSTRAINTS_FILE } from './activity-writer'

export type AgentActivityReadWarning = {
  file: string
  message: string
}

export function readAgentActivityEvents(runDir: string): AgentActivityEvent[] {
  return readAgentActivityEventsWithWarnings(runDir).events
}

export function readAgentActivityEventsWithWarnings(runDir: string): {
  events: AgentActivityEvent[]
  warnings: AgentActivityReadWarning[]
  exists: boolean
} {
  const filePath = path.join(runDir, AGENT_EVENTS_FILE)
  if (!fs.existsSync(filePath)) return { events: [], warnings: [], exists: false }
  const events: AgentActivityEvent[] = []
  const warnings: AgentActivityReadWarning[] = []
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return
      try {
        events.push(JSON.parse(trimmed) as AgentActivityEvent)
      } catch {
        warnings.push({
          file: AGENT_EVENTS_FILE,
          message: `Skipped malformed activity event line ${index + 1}`,
        })
      }
    })
  return { events, warnings, exists: true }
}

export function readAgentConstraints(runDir: string): AgentConstraintsFile {
  const filePath = path.join(runDir, CONSTRAINTS_FILE)
  if (!fs.existsSync(filePath)) return { schema_version: 1, constraints: [] }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as AgentConstraintsFile
  } catch {
    return { schema_version: 1, constraints: [] }
  }
}
