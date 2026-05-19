import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AgentActivityEvent, AgentConstraintsFile } from './activity-contracts'
import { AGENT_EVENTS_FILE, CONSTRAINTS_FILE } from './activity-writer'

export function readAgentActivityEvents(runDir: string): AgentActivityEvent[] {
  const filePath = path.join(runDir, AGENT_EVENTS_FILE)
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line) as AgentActivityEvent]
      } catch {
        return []
      }
    })
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
