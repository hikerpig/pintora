export type HarnessReviewStatus = 'not_requested' | 'pending' | 'completed' | 'consumed'

export type HarnessOrchestrationActionType = 'accept' | 'repair' | 'rerun' | 'escalate'

export type HarnessOrchestrationAction = {
  type: HarnessOrchestrationActionType
  reason?: string
  target?: 'diagram_source' | 'render_pipeline' | 'browser_capture'
}

export type HarnessReviewDecision = {
  status: 'completed' | 'failed'
  review_status: 'consumed'
  source: {
    summary: string
    review: string
  }
  next_step: HarnessOrchestrationAction
}

export type RunHarnessApplyReviewOptions = {
  artifactsDir: string
  reviewFile: string
  outFile: string
}

export type RunHarnessApplyReviewResult = {
  status: 'completed' | 'failed'
  review_status: 'consumed'
  decision: string
}
