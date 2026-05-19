import * as fs from 'node:fs'
import * as path from 'node:path'
import { readAgentActivityEvents, readAgentConstraints } from './activity-reader'
import { AGENT_SUMMARY_FILE, CONSTRAINT_GAPS_FILE, initializeAgentActivityFiles } from './activity-writer'

type MinimalManifest = {
  run_id?: string
  task?: { title?: string }
  outcome?: Record<string, string>
}

export async function runHarnessSummarizeAgentRun(opts: { runDir: string }) {
  initializeAgentActivityFiles(opts.runDir)
  const manifest = readJson<MinimalManifest>(path.join(opts.runDir, 'manifest.json')) || {}
  const events = readAgentActivityEvents(opts.runDir)
  const constraints = readAgentConstraints(opts.runDir)
  const runId = manifest.run_id || path.basename(opts.runDir)

  fs.writeFileSync(path.join(opts.runDir, AGENT_SUMMARY_FILE), buildAgentSummary(runId, manifest, events))
  fs.writeFileSync(path.join(opts.runDir, CONSTRAINT_GAPS_FILE), buildConstraintGaps(runId, events, constraints))

  return {
    status: 'completed' as const,
    summary: AGENT_SUMMARY_FILE,
    gaps: CONSTRAINT_GAPS_FILE,
  }
}

function buildAgentSummary(
  runId: string,
  manifest: MinimalManifest,
  events: ReturnType<typeof readAgentActivityEvents>,
) {
  const constraintChecks = events.filter(event => event.kind === 'constraint_check')
  const courseCorrections = events.filter(event => event.kind === 'course_correction')
  const lines = [
    `# Agent Summary: ${runId}`,
    '',
    `Task: ${manifest.task?.title || 'unknown task'}`,
    '',
    '## Outcomes',
    '',
    ...Object.entries(manifest.outcome || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Events',
    '',
    ...events.map(event => `- ${event.phase}/${event.kind}: ${event.summary}`),
    '',
    '## Constraint Checks',
    '',
  ]

  if (constraintChecks.length === 0) {
    lines.push('- None recorded')
  } else {
    for (const event of constraintChecks) {
      lines.push(`- ${String(event.data.constraint_id || 'unknown')}: ${String(event.data.status || 'unknown')}`)
    }
  }

  lines.push('', '## Course Corrections', '')
  if (courseCorrections.length === 0) {
    lines.push('- None recorded')
  } else {
    lines.push(...courseCorrections.map(event => `- ${event.summary}`))
  }

  return `${lines.join('\n')}\n`
}

function buildConstraintGaps(
  runId: string,
  events: ReturnType<typeof readAgentActivityEvents>,
  constraints: ReturnType<typeof readAgentConstraints>,
) {
  const gapEvents = events.filter(
    event =>
      event.kind === 'constraint_check' && (event.data.status === 'missed' || event.data.status === 'conflicted'),
  )
  const knownConstraints = new Map(constraints.constraints.map(item => [item.id, item]))
  const lines = [`# Constraint Gaps: ${runId}`, '']

  if (gapEvents.length === 0) {
    lines.push('- None recorded')
  } else {
    for (const event of gapEvents) {
      const constraintId = String(event.data.constraint_id || 'unknown')
      const constraint = knownConstraints.get(constraintId)
      lines.push(
        `## ${constraintId}`,
        '',
        `- status: ${String(event.data.status || 'unknown')}`,
        `- summary: ${event.summary}`,
        `- source: ${constraint?.source || 'unknown'}`,
        `- evidence: ${String(event.data.evidence || 'not recorded')}`,
        '',
      )
    }
  }

  return `${lines.join('\n')}\n`
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}
