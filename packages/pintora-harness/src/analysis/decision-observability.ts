import * as fs from 'node:fs'
import type { HarnessStatus } from '../contracts/harness'

export type PredictionQualityResult = 'confirmed' | 'partially_confirmed' | 'disconfirmed' | 'inconclusive'

export type HarnessDecisionEvent =
  | {
      schema_version?: number
      kind: 'prediction'
      id?: string
      claim?: string
      expected_improve?: string[]
      expected_unchanged?: string[]
      risk?: string
    }
  | {
      schema_version?: number
      kind: 'prediction_result'
      prediction_ref?: string
      result?: PredictionQualityResult
      evidence?: string[]
    }

export type PredictionQualitySummary = Record<PredictionQualityResult | 'pending', number>

export type PredictionComparisonCase = {
  caseId: string
  status: HarnessStatus
}

export type PredictionEvaluation = {
  prediction_ref: string
  result: PredictionQualityResult
  evidence: string[]
}

export function readDecisionEvents(filePath: string | null): HarnessDecisionEvent[] {
  if (!filePath || !fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        const parsed = JSON.parse(line) as Partial<HarnessDecisionEvent>
        return parsed.kind === 'prediction' || parsed.kind === 'prediction_result'
          ? [parsed as HarnessDecisionEvent]
          : []
      } catch {
        return []
      }
    })
}

export function summarizePredictionQuality(
  events: HarnessDecisionEvent[],
  automaticResults: PredictionEvaluation[] = [],
): PredictionQualitySummary {
  const summary: PredictionQualitySummary = {
    confirmed: 0,
    partially_confirmed: 0,
    disconfirmed: 0,
    inconclusive: 0,
    pending: 0,
  }
  const predictions = new Set<string>()
  const resolved = new Set<string>()

  const predictionResultRefs = new Set<string>()

  for (const event of events) {
    if (event.kind === 'prediction') {
      predictions.add(event.id || `prediction-${predictions.size + 1}`)
    } else if (event.kind === 'prediction_result' && event.result && event.result in summary) {
      summary[event.result]++
      if (event.prediction_ref) {
        resolved.add(event.prediction_ref)
        predictionResultRefs.add(event.prediction_ref)
      }
    }
  }

  for (const result of automaticResults) {
    if (predictionResultRefs.has(result.prediction_ref)) continue
    summary[result.result]++
    resolved.add(result.prediction_ref)
  }

  for (const id of predictions) {
    if (!resolved.has(id)) summary.pending++
  }

  return summary
}

export function evaluatePredictionsAgainstComparison(
  events: HarnessDecisionEvent[],
  baseCases: PredictionComparisonCase[],
  headCases: PredictionComparisonCase[],
): PredictionEvaluation[] {
  const baseStatusByCase = new Map(baseCases.map(item => [item.caseId, item.status]))
  const headStatusByCase = new Map(headCases.map(item => [item.caseId, item.status]))
  let anonymousPredictionCount = 0
  const results: PredictionEvaluation[] = []

  for (const event of events) {
    if (event.kind !== 'prediction') continue
    const predictionRef = event.id || `prediction-${++anonymousPredictionCount}`
    const expectedImprove = event.expected_improve || []
    const expectedUnchanged = event.expected_unchanged || []
    const evidence: string[] = []
    let missingEvidence = false
    let criticalRegression = false
    let improvedCount = 0

    if (expectedImprove.length === 0 && expectedUnchanged.length === 0) {
      results.push({
        prediction_ref: predictionRef,
        result: 'inconclusive',
        evidence: ['prediction has no expected_improve or expected_unchanged cases'],
      })
      continue
    }

    for (const caseId of expectedImprove) {
      const baseStatus = baseStatusByCase.get(caseId)
      const headStatus = headStatusByCase.get(caseId)
      if (!baseStatus || !headStatus) {
        missingEvidence = true
        evidence.push(`${caseId}: missing comparison evidence`)
        continue
      }

      const transition = `${caseId}: ${baseStatus} -> ${headStatus}`
      if (statusRank(headStatus) < statusRank(baseStatus)) {
        improvedCount++
        evidence.push(`${transition} improved`)
      } else if (statusRank(headStatus) > statusRank(baseStatus)) {
        criticalRegression = true
        evidence.push(`${transition} regressed`)
      } else {
        evidence.push(`${transition} unchanged`)
      }
    }

    for (const caseId of expectedUnchanged) {
      const baseStatus = baseStatusByCase.get(caseId)
      const headStatus = headStatusByCase.get(caseId)
      if (!baseStatus || !headStatus) {
        missingEvidence = true
        evidence.push(`${caseId}: missing comparison evidence`)
        continue
      }

      const transition = `${caseId}: ${baseStatus} -> ${headStatus}`
      if (statusRank(headStatus) > statusRank(baseStatus)) {
        criticalRegression = true
        evidence.push(`${transition} regressed`)
      } else {
        evidence.push(`${transition} did not regress`)
      }
    }

    if (missingEvidence) {
      results.push({ prediction_ref: predictionRef, result: 'inconclusive', evidence })
      continue
    }
    if (criticalRegression) {
      results.push({ prediction_ref: predictionRef, result: 'disconfirmed', evidence })
      continue
    }
    if (expectedImprove.length > 0 && improvedCount === expectedImprove.length) {
      results.push({ prediction_ref: predictionRef, result: 'confirmed', evidence })
      continue
    }
    if (improvedCount > 0) {
      results.push({ prediction_ref: predictionRef, result: 'partially_confirmed', evidence })
      continue
    }
    if (expectedImprove.length === 0 && expectedUnchanged.length > 0) {
      results.push({ prediction_ref: predictionRef, result: 'confirmed', evidence })
      continue
    }

    results.push({ prediction_ref: predictionRef, result: 'inconclusive', evidence })
  }

  return results
}

function statusRank(status: HarnessStatus) {
  if (status === 'ok') return 0
  if (status === 'suspicious') return 1
  return 2
}
