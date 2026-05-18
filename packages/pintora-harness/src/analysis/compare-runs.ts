import type { HarnessStatus } from '../contracts/harness'
import {
  evaluatePredictionsAgainstComparison,
  summarizePredictionQuality,
  type PredictionEvaluation,
  type PredictionQualitySummary,
} from './decision-observability'
import { readTraceRunRecord, type TraceRunRecord } from './run-reader'

export type CompareRunsStatusTransition = {
  case_id: string
  from: HarnessStatus
  to: HarnessStatus
}

export type CompareRunsUnchangedCase = {
  case_id: string
  status: HarnessStatus
}

export type CompareRunsMissingCase = {
  case_id: string
  missing_from: 'base' | 'head'
}

export type CompareRunsFindingChange = {
  case_id: string
  from: string | null
  to: string | null
}

export type CompareRunsCommandChange = {
  command: string
  phase: string
  base_exit_code: number | null
  head_exit_code: number | null
  base_summary: string | null
  head_summary: string | null
}

export type CompareRunsReport = {
  schema_version: 1
  generated_at: string
  base: string
  head: string
  improved: CompareRunsStatusTransition[]
  regressed: CompareRunsStatusTransition[]
  unchanged: CompareRunsUnchangedCase[]
  missing: CompareRunsMissingCase[]
  finding_changes: CompareRunsFindingChange[]
  command_changes: CompareRunsCommandChange[]
  prediction_results: PredictionEvaluation[]
  prediction_quality: PredictionQualitySummary
}

export async function runHarnessCompareRuns(opts: {
  baseRunDir: string
  headRunDir: string
}): Promise<CompareRunsReport> {
  const base = readTraceRunRecord(opts.baseRunDir)
  const head = readTraceRunRecord(opts.headRunDir)
  assertComparableRun(base, 'base')
  assertComparableRun(head, 'head')
  return buildCompareRunsReport(base, head)
}

export function buildCompareRunsReport(base: TraceRunRecord, head: TraceRunRecord): CompareRunsReport {
  const baseCases = new Map(base.cases.map(item => [item.caseId, item]))
  const headCases = new Map(head.cases.map(item => [item.caseId, item]))
  const caseIds = Array.from(new Set([...baseCases.keys(), ...headCases.keys()])).sort()
  const improved: CompareRunsStatusTransition[] = []
  const regressed: CompareRunsStatusTransition[] = []
  const unchanged: CompareRunsUnchangedCase[] = []
  const missing: CompareRunsMissingCase[] = []
  const findingChanges: CompareRunsFindingChange[] = []

  for (const caseId of caseIds) {
    const baseCase = baseCases.get(caseId)
    const headCase = headCases.get(caseId)
    if (!baseCase) {
      missing.push({ case_id: caseId, missing_from: 'base' })
      continue
    }
    if (!headCase) {
      missing.push({ case_id: caseId, missing_from: 'head' })
      continue
    }

    if (statusRank(headCase.status) < statusRank(baseCase.status)) {
      improved.push({ case_id: caseId, from: baseCase.status, to: headCase.status })
    } else if (statusRank(headCase.status) > statusRank(baseCase.status)) {
      regressed.push({ case_id: caseId, from: baseCase.status, to: headCase.status })
    } else {
      unchanged.push({ case_id: caseId, status: headCase.status })
    }

    const baseSignature = baseCase.summary?.failure_signature ?? null
    const headSignature = headCase.summary?.failure_signature ?? null
    if (baseSignature !== headSignature) {
      findingChanges.push({ case_id: caseId, from: baseSignature, to: headSignature })
    }
  }

  const predictionResults = evaluatePredictionsAgainstComparison(head.decisions, base.cases, head.cases)

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    base: base.runId,
    head: head.runId,
    improved,
    regressed,
    unchanged,
    missing,
    finding_changes: findingChanges,
    command_changes: compareCommands(base, head),
    prediction_results: predictionResults,
    prediction_quality: summarizePredictionQuality(head.decisions, predictionResults),
  }
}

function assertComparableRun(record: TraceRunRecord, label: 'base' | 'head') {
  if (!record.manifest) throw new Error(`Invalid ${label} run: missing manifest.json`)
  if (!record.suite) throw new Error(`Invalid ${label} run: missing suite.json`)
}

function compareCommands(base: TraceRunRecord, head: TraceRunRecord): CompareRunsCommandChange[] {
  const baseCommands = new Map(base.commands.map(command => [commandKey(command.phase, command.cmd), command]))
  const headCommands = new Map(head.commands.map(command => [commandKey(command.phase, command.cmd), command]))
  const keys = Array.from(new Set([...baseCommands.keys(), ...headCommands.keys()])).sort()

  return keys.flatMap(key => {
    const baseCommand = baseCommands.get(key)
    const headCommand = headCommands.get(key)
    if (
      baseCommand &&
      headCommand &&
      baseCommand.exit_code === headCommand.exit_code &&
      baseCommand.summary === headCommand.summary
    ) {
      return []
    }

    return [
      {
        command: baseCommand?.cmd || headCommand?.cmd || key,
        phase: baseCommand?.phase || headCommand?.phase || key.split(':', 1)[0],
        base_exit_code: baseCommand?.exit_code ?? null,
        head_exit_code: headCommand?.exit_code ?? null,
        base_summary: baseCommand?.summary ?? null,
        head_summary: headCommand?.summary ?? null,
      },
    ]
  })
}

function commandKey(phase: string, cmd: string) {
  return `${phase}:${cmd}`
}

function statusRank(status: HarnessStatus) {
  if (status === 'ok') return 0
  if (status === 'suspicious') return 1
  return 2
}
