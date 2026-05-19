export const ACTIVITY_EVENT_KINDS = [
  'context_read',
  'agent_plan',
  'constraint_check',
  'edit_intent',
  'edit_result',
  'verification',
  'course_correction',
  'open_question',
  'final_summary',
] as const

export const ACTIVITY_EVENT_PHASES = [
  'context',
  'planning',
  'implementation',
  'verification',
  'review',
  'handoff',
] as const

export const CONSTRAINT_STATUSES = ['observed', 'missed', 'conflicted', 'not_applicable', 'unknown'] as const

export type ActivityEventKind = (typeof ACTIVITY_EVENT_KINDS)[number]
export type ActivityEventPhase = (typeof ACTIVITY_EVENT_PHASES)[number]
export type ConstraintStatus = (typeof CONSTRAINT_STATUSES)[number]

export type ActivityEventData = Record<string, unknown>

export type AgentActivityEvent = {
  schema_version: 1
  ts: string
  kind: ActivityEventKind
  phase: ActivityEventPhase
  summary: string
  data: ActivityEventData
}

export type AgentConstraint = {
  id: string
  source: string
  source_ref?: string
  text: string
  scope: string[]
  severity: 'must' | 'should' | 'may'
  notes?: string
}

export type AgentConstraintsFile = {
  schema_version: 1
  constraints: AgentConstraint[]
}

export function assertActivityEventKind(value: string): ActivityEventKind {
  if ((ACTIVITY_EVENT_KINDS as readonly string[]).includes(value)) return value as ActivityEventKind
  throw new Error(`Invalid activity event kind: ${value}`)
}

export function assertActivityEventPhase(value: string): ActivityEventPhase {
  if ((ACTIVITY_EVENT_PHASES as readonly string[]).includes(value)) return value as ActivityEventPhase
  throw new Error(`Invalid activity event phase: ${value}`)
}

export function assertConstraintStatus(value: string): ConstraintStatus {
  if ((CONSTRAINT_STATUSES as readonly string[]).includes(value)) return value as ConstraintStatus
  throw new Error(`Invalid constraint status: ${value}`)
}

export function parseActivityEventData(input: string): ActivityEventData {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    throw new Error(`Invalid activity event data JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Activity event data must be a JSON object')
  }

  return parsed as ActivityEventData
}
