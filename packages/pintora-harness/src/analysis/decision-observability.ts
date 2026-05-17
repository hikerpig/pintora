import * as fs from 'node:fs'

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

export function summarizePredictionQuality(events: HarnessDecisionEvent[]): PredictionQualitySummary {
  const summary: PredictionQualitySummary = {
    confirmed: 0,
    partially_confirmed: 0,
    disconfirmed: 0,
    inconclusive: 0,
    pending: 0,
  }
  const predictions = new Set<string>()
  const resolved = new Set<string>()

  for (const event of events) {
    if (event.kind === 'prediction') {
      predictions.add(event.id || `prediction-${predictions.size + 1}`)
    } else if (event.kind === 'prediction_result' && event.result && event.result in summary) {
      summary[event.result]++
      if (event.prediction_ref) resolved.add(event.prediction_ref)
    }
  }

  for (const id of predictions) {
    if (!resolved.has(id)) summary.pending++
  }

  return summary
}
