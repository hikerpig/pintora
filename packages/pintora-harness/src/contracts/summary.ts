import { HarnessStatus } from './harness'

export type SummaryNextAction = 'done' | 'capture_browser' | 'human_review_or_visual_judge' | 'repair_and_rerun'

export type SummaryArtifacts = {
  svg: string | null
  png: string | null
  browser_png: string | null
  dom_html: string | null
  metrics: string
  findings: string
}

export type SummaryScores = {
  legibility: number | null
  structural_clarity: number | null
  spatial_balance: number | null
  visual_taste: number | null
}

export type HarnessSummary = {
  run_id: string
  case_id: string | null
  diagram_type: string | null
  status: HarnessStatus
  pipeline: string[]
  artifacts: SummaryArtifacts
  scores: SummaryScores
  top_findings: string[]
  next_action: SummaryNextAction
  judge: {
    required: boolean
    inputs: {
      artifacts: string[]
    }
  }
}
