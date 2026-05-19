import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AgentActivityEvent, ConstraintStatus } from './activity-contracts'
import { readAgentActivityEventsWithWarnings } from './activity-reader'
import { listTraceRunDirs, readTraceRunRecord } from '../analysis/run-reader'

type ConstraintCount = Record<ConstraintStatus, number>

export type AnalyzeAgentRunsReport = {
  schema_version: 1
  generated_at: string
  total_runs: number
  runs_with_activity: number
  runs_missing_activity: number
  constraint_observance: Array<{ constraint_id: string } & ConstraintCount>
  frequent_gaps: Array<{ title: string; count: number; evidence_runs: string[] }>
  course_correction_patterns: Array<{ trigger: string; count: number; common_next_action: string | null }>
  constraint_failure_correlation: Array<{ constraint_id: string; non_ok_harness_runs: number; sample_runs: string[] }>
  warnings: Array<{ run_id: string; file: string; message: string }>
}

export async function runHarnessAnalyzeAgentRuns(opts: { runsDir: string; outFile: string }) {
  const records = listTraceRunDirs(opts.runsDir).map(runDir => {
    const traceRecord = readTraceRunRecord(runDir)
    const activity = readAgentActivityEventsWithWarnings(runDir)
    return {
      traceRecord,
      activity,
    }
  })
  const report = buildAnalyzeAgentRunsReport(records)

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, `${JSON.stringify(report, null, 2)}\n`)

  return {
    status: 'completed' as const,
    report: path.basename(opts.outFile),
    totalRuns: report.total_runs,
  }
}

export function buildAnalyzeAgentRunsReport(
  records: Array<{
    traceRecord: ReturnType<typeof readTraceRunRecord>
    activity: ReturnType<typeof readAgentActivityEventsWithWarnings>
  }>,
): AnalyzeAgentRunsReport {
  const constraintCounts = new Map<string, ConstraintCount>()
  const gapCounts = new Map<string, Set<string>>()
  const correctionCounts = new Map<string, { count: number; nextActions: Map<string, number> }>()
  const failureCorrelations = new Map<string, Set<string>>()
  const warnings: AnalyzeAgentRunsReport['warnings'] = []

  for (const record of records) {
    const runId = record.traceRecord.runId
    for (const warning of record.activity.warnings) {
      warnings.push({ run_id: runId, ...warning })
    }

    const nonOkHarness = isNonOkHarnessOutcome(record.traceRecord.manifest?.outcome?.harness)
    for (const event of record.activity.events) {
      if (event.kind === 'constraint_check') {
        const constraintId = stringData(event, 'constraint_id') || 'unknown'
        const status = constraintStatus(event)
        const counts = getConstraintCount(constraintCounts, constraintId)
        counts[status]++

        if (status === 'missed' || status === 'conflicted') {
          const gapRuns = gapCounts.get(event.summary) || new Set<string>()
          gapRuns.add(runId)
          gapCounts.set(event.summary, gapRuns)

          if (nonOkHarness) {
            const runs = failureCorrelations.get(constraintId) || new Set<string>()
            runs.add(runId)
            failureCorrelations.set(constraintId, runs)
          }
        }
      }

      if (event.kind === 'course_correction') {
        const trigger = stringData(event, 'trigger') || event.summary
        const nextAction = stringData(event, 'next_action') || 'unknown'
        const count = correctionCounts.get(trigger) || { count: 0, nextActions: new Map<string, number>() }
        count.count++
        count.nextActions.set(nextAction, (count.nextActions.get(nextAction) || 0) + 1)
        correctionCounts.set(trigger, count)
      }
    }
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    total_runs: records.length,
    runs_with_activity: records.filter(record => record.activity.exists).length,
    runs_missing_activity: records.filter(record => !record.activity.exists).length,
    constraint_observance: Array.from(constraintCounts.entries())
      .map(([constraint_id, counts]) => ({ constraint_id, ...counts }))
      .sort((a, b) => a.constraint_id.localeCompare(b.constraint_id)),
    frequent_gaps: Array.from(gapCounts.entries())
      .map(([title, runs]) => ({ title, count: runs.size, evidence_runs: Array.from(runs).sort() }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
    course_correction_patterns: Array.from(correctionCounts.entries())
      .map(([trigger, count]) => ({
        trigger,
        count: count.count,
        common_next_action: commonNextAction(count.nextActions),
      }))
      .sort((a, b) => b.count - a.count || a.trigger.localeCompare(b.trigger)),
    constraint_failure_correlation: Array.from(failureCorrelations.entries())
      .map(([constraint_id, runs]) => ({
        constraint_id,
        non_ok_harness_runs: runs.size,
        sample_runs: Array.from(runs).sort().slice(0, 5),
      }))
      .sort((a, b) => b.non_ok_harness_runs - a.non_ok_harness_runs || a.constraint_id.localeCompare(b.constraint_id)),
    warnings,
  }
}

function getConstraintCount(map: Map<string, ConstraintCount>, constraintId: string) {
  let count = map.get(constraintId)
  if (!count) {
    count = { observed: 0, missed: 0, conflicted: 0, not_applicable: 0, unknown: 0 }
    map.set(constraintId, count)
  }
  return count
}

function constraintStatus(event: AgentActivityEvent): ConstraintStatus {
  const status = event.data.status
  if (
    status === 'observed' ||
    status === 'missed' ||
    status === 'conflicted' ||
    status === 'not_applicable' ||
    status === 'unknown'
  ) {
    return status
  }
  return 'unknown'
}

function stringData(event: AgentActivityEvent, key: string) {
  const value = event.data[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function commonNextAction(nextActions: Map<string, number>) {
  const sorted = Array.from(nextActions.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return sorted[0]?.[0] || null
}

function isNonOkHarnessOutcome(value: string | undefined) {
  return value === 'suspicious' || value === 'fail' || value === 'failed_to_start'
}
