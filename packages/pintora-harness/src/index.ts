export type { HarnessCase, HarnessDiagramType, HarnessStatus } from './contracts/harness'
export type { CaptureViewport } from './contracts/browser'
export type { HarnessSummary, SummaryArtifacts, SummaryNextAction, SummaryScores } from './contracts/summary'
export type { RunCaseOptions, RunCaseResult, RunSuiteOptions, RunSuiteSummary } from './orchestration/run-contracts'
export type {
  HarnessReviewAdapter,
  HarnessReviewAdapterInput,
  HarnessReviewAdapterName,
  HarnessReviewPayload,
  HarnessReviewResult,
  HarnessReviewVerdict,
  RunHarnessReviewCaseResult,
} from './review/review-contracts'
export { loadCaseRegistry, resolveCaseInput, resolveHarnessWorkspaceRoot } from './cases/case-registry'
export { readHarnessSource, resolveHarnessInput } from './cases/read-input'
export { statusToExitCode } from './exit-codes'
export { runHarnessCase } from './orchestration/run-case'
export { runHarnessSuite } from './orchestration/run-suite'
export { runHarnessRenderSvg } from './rendering/render-svg'
export { runHarnessInspectSvg } from './inspection/inspect-svg'
export { runHarnessCaptureBrowser } from './browser/capture-browser'
export { runHarnessSummarizeCase } from './summary/summarize-case'
export { resolveHarnessReviewAdapter } from './review/review-adapter'
export { buildHarnessReviewPayload } from './review/review-payload'
export { runHarnessReviewCase } from './review/review-case'
export type {
  TraceCommandEntry,
  TraceCommandPhase,
  TraceEnvironment,
  TraceGitState,
  TraceManifest,
  TraceOutcomeValue,
  TraceRunOptions,
  TraceRunResult,
} from './trace/trace-contracts'
export { runHarnessTraceRun } from './trace/trace-run'
export { buildTraceRunId, slugifyTraceTask } from './trace/run-id'
export type { AnalyzeRunsReport } from './analysis/analyze-runs'
export { runHarnessAnalyzeRuns, buildAnalyzeRunsReport } from './analysis/analyze-runs'
export type {
  ActivityEventData,
  ActivityEventKind,
  ActivityEventPhase,
  AgentActivityEvent,
  AgentConstraint,
  AgentConstraintsFile,
  ConstraintStatus,
} from './activity/activity-contracts'
export {
  ACTIVITY_EVENT_KINDS,
  ACTIVITY_EVENT_PHASES,
  CONSTRAINT_STATUSES,
  assertActivityEventKind,
  assertActivityEventPhase,
  assertConstraintStatus,
  parseActivityEventData,
} from './activity/activity-contracts'
export {
  AGENT_EVENTS_FILE,
  AGENT_SUMMARY_FILE,
  CONSTRAINTS_FILE,
  CONSTRAINT_GAPS_FILE,
  appendAgentActivityEvent,
  buildAgentActivityEvent,
  initializeAgentActivityFiles,
  runHarnessTraceAgentEvent,
} from './activity/activity-writer'
export type { RunHarnessTraceAgentEventOptions } from './activity/activity-writer'
export { readAgentActivityEvents, readAgentConstraints } from './activity/activity-reader'
export type { AnalyzeAgentRunsReport } from './activity/analyze-agent-runs'
export { buildAnalyzeAgentRunsReport, runHarnessAnalyzeAgentRuns } from './activity/analyze-agent-runs'
export { runHarnessSummarizeAgentRun } from './activity/summarize-agent-run'
export type {
  CompareRunsCommandChange,
  CompareRunsFindingChange,
  CompareRunsMissingCase,
  CompareRunsReport,
  CompareRunsStatusTransition,
  CompareRunsUnchangedCase,
} from './analysis/compare-runs'
export { runHarnessCompareRuns, buildCompareRunsReport } from './analysis/compare-runs'
export { runHarnessBriefRun } from './analysis/brief-run'
export type {
  HarnessDecisionEvent,
  PredictionComparisonCase,
  PredictionEvaluation,
  PredictionQualityResult,
  PredictionQualitySummary,
} from './analysis/decision-observability'
export {
  evaluatePredictionsAgainstComparison,
  readDecisionEvents,
  summarizePredictionQuality,
} from './analysis/decision-observability'
export type {
  HarnessOrchestrationAction,
  HarnessOrchestrationActionType,
  HarnessReviewDecision,
  HarnessReviewStatus,
  RunHarnessApplyReviewOptions,
  RunHarnessApplyReviewResult,
} from './review/apply-review-contracts'
export { runHarnessApplyReview } from './review/apply-review'
