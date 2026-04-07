import type { HarnessStatus } from '../contracts/harness'
import type { SummaryNextAction } from '../contracts/summary'

export type HarnessReviewAdapterName = 'manual-review-pack' | 'noop'

export type HarnessReviewVerdict = 'accept' | 'reject' | 'needs_human_review' | 'inconclusive'

export type HarnessReviewActionType = 'accept' | 'reject' | 'repair' | 'rerun' | 'escalate'

export type HarnessReviewRecommendedAction = {
  type: HarnessReviewActionType
  reason?: string
  target?: 'diagram_source' | 'render_pipeline' | 'browser_capture'
  requires_human_confirmation?: boolean
}

export type HarnessReviewPayload = {
  run_id: string
  case_id: string | null
  diagram_type: string | null
  status: HarnessStatus
  next_action: SummaryNextAction
  top_findings: string[]
  artifacts: {
    svg: string | null
    browser_png: string | null
    dom_html: string | null
    metrics: string
    findings: string
    summary: string
  }
  judge_inputs: string[]
}

export type HarnessReviewResult = {
  adapter: HarnessReviewAdapterName
  status: 'completed' | 'failed'
  verdict: HarnessReviewVerdict
  confidence: number | null
  summary: string
  recommended_action?: HarnessReviewRecommendedAction
  run_id?: string
  artifacts: {
    pack_dir?: string
  }
}

export type RunHarnessReviewCaseResult = {
  adapter: HarnessReviewAdapterName
  status: 'completed' | 'failed'
  verdict: HarnessReviewVerdict
  review: string
}

export type HarnessReviewAdapterInput = {
  artifactsDir: string
  payload: HarnessReviewPayload
  outFile: string
  packDir?: string
}

export interface HarnessReviewAdapter {
  name: HarnessReviewAdapterName
  run(input: HarnessReviewAdapterInput): Promise<HarnessReviewResult>
}
