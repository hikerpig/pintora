import * as fs from 'node:fs'
import * as path from 'node:path'
import type { HarnessStatus } from '../contracts/harness'
import { summarizePredictionQuality, type PredictionQualitySummary } from './decision-observability'
import { listTraceRunDirs, readChangedPathsFromDiff, readTraceRunRecord, type TraceRunRecord } from './run-reader'

type CountBlock = Record<HarnessStatus, number>

export type AnalyzeRunsReport = {
  schema_version: 1
  generated_at: string
  total_runs: number
  complete_runs: number
  incomplete_runs: number
  case_hotspots: Array<{ case_id: string } & CountBlock>
  finding_hotspots: Array<{ failure_signature: string; count: number }>
  rule_noise_candidates: Array<{ finding_code: string; false_positive_rate: number; sample_size: number }>
  component_risk: Array<{ path: string; regression_runs: number }>
  prediction_quality: PredictionQualitySummary
  incomplete: Array<{ run_id: string; reason: string }>
}

const MIN_RULE_NOISE_SAMPLE_SIZE = 5

export async function runHarnessAnalyzeRuns(opts: { runsDir: string; outFile: string }) {
  const records = listTraceRunDirs(opts.runsDir).map(readTraceRunRecord)
  const report = buildAnalyzeRunsReport(records)

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, `${JSON.stringify(report, null, 2)}\n`)

  return {
    status: 'completed' as const,
    report: path.basename(opts.outFile),
    totalRuns: report.total_runs,
  }
}

export function buildAnalyzeRunsReport(records: TraceRunRecord[]): AnalyzeRunsReport {
  const caseCounts = new Map<string, CountBlock>()
  const findingCounts = new Map<string, number>()
  const ruleNoiseCounts = new Map<string, { accepted: number; reviewed: number }>()
  const componentRisk = new Map<string, Set<string>>()
  const predictionQuality: PredictionQualitySummary = {
    confirmed: 0,
    partially_confirmed: 0,
    disconfirmed: 0,
    inconclusive: 0,
    pending: 0,
  }

  for (const record of records) {
    const decisionQuality = summarizePredictionQuality(record.decisions)
    for (const key of Object.keys(predictionQuality) as Array<keyof PredictionQualitySummary>) {
      predictionQuality[key] += decisionQuality[key]
    }

    const changedPaths = record.manifest?.git.git_after_diff
      ? readChangedPathsFromDiff(path.join(record.runDir, record.manifest.git.git_after_diff))
      : []

    for (const item of record.cases) {
      const count = getCaseCount(caseCounts, item.caseId)
      count[item.status]++

      const signature = item.summary?.failure_signature
      if (item.status !== 'ok' && signature) {
        findingCounts.set(signature, (findingCounts.get(signature) || 0) + 1)
      }
      if (item.status === 'suspicious' && signature && item.reviewDecision) {
        const count = ruleNoiseCounts.get(signature) || { accepted: 0, reviewed: 0 }
        count.reviewed++
        if (item.reviewDecision === 'accept') count.accepted++
        ruleNoiseCounts.set(signature, count)
      }

      const suspectedComponent = item.summary?.suspected_component
      if (item.status !== 'ok' && suspectedComponent) {
        const riskRuns = componentRisk.get(suspectedComponent) || new Set<string>()
        riskRuns.add(record.runId)
        componentRisk.set(suspectedComponent, riskRuns)
      }
    }

    for (const changedPath of changedPaths) {
      if (record.manifest?.outcome.harness === 'suspicious' || record.manifest?.outcome.harness === 'fail') {
        const prefix = componentPrefix(changedPath)
        if (prefix) {
          const riskRuns = componentRisk.get(prefix) || new Set<string>()
          riskRuns.add(record.runId)
          componentRisk.set(prefix, riskRuns)
        }
      }
    }
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    total_runs: records.length,
    complete_runs: records.filter(record => !record.incomplete).length,
    incomplete_runs: records.filter(record => record.incomplete).length,
    case_hotspots: Array.from(caseCounts.entries())
      .map(([case_id, counts]) => ({ case_id, ...counts }))
      .sort((a, b) => b.fail * 3 + b.suspicious - (a.fail * 3 + a.suspicious) || a.case_id.localeCompare(b.case_id)),
    finding_hotspots: Array.from(findingCounts.entries())
      .map(([failure_signature, count]) => ({ failure_signature, count }))
      .sort((a, b) => b.count - a.count || a.failure_signature.localeCompare(b.failure_signature)),
    rule_noise_candidates: Array.from(ruleNoiseCounts.entries())
      .filter(([, counts]) => counts.reviewed >= MIN_RULE_NOISE_SAMPLE_SIZE && counts.accepted > 0)
      .map(([finding_code, counts]) => ({
        finding_code,
        false_positive_rate: counts.accepted / counts.reviewed,
        sample_size: counts.reviewed,
      }))
      .sort(
        (a, b) =>
          b.false_positive_rate - a.false_positive_rate ||
          b.sample_size - a.sample_size ||
          a.finding_code.localeCompare(b.finding_code),
      ),
    component_risk: Array.from(componentRisk.entries())
      .map(([componentPath, runs]) => ({ path: componentPath, regression_runs: runs.size }))
      .sort((a, b) => b.regression_runs - a.regression_runs || a.path.localeCompare(b.path)),
    prediction_quality: predictionQuality,
    incomplete: records
      .filter(record => record.incomplete)
      .map(record => ({ run_id: record.runId, reason: record.incompleteReason || 'incomplete run' })),
  }
}

function getCaseCount(map: Map<string, CountBlock>, caseId: string) {
  let count = map.get(caseId)
  if (!count) {
    count = { ok: 0, suspicious: 0, fail: 0 }
    map.set(caseId, count)
  }
  return count
}

function componentPrefix(filePath: string) {
  if (filePath.startsWith('packages/pintora-diagrams/src/er/')) return 'packages/pintora-diagrams/src/er'
  if (filePath.startsWith('packages/pintora-diagrams/src/sequence/')) return 'packages/pintora-diagrams/src/sequence'
  const match = /^(packages\/[^/]+\/src\/[^/]+)/.exec(filePath)
  return match?.[1] || null
}
