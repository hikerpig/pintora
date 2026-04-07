import { HarnessFinding } from '../inspection/findings'
import { HarnessStatus } from '../contracts/harness'
import { HarnessSummary, SummaryArtifacts, SummaryScores } from '../contracts/summary'

type HarnessSummaryRulesInput = {
  run_id: string
  case_id: string | null
  diagram_type: string | null
  artifacts: SummaryArtifacts
  metrics: {
    viewBox: unknown | null
    rootChildCount?: number | null
  }
  findings: Array<Partial<HarnessFinding> & { message?: string }>
}

export function buildHarnessSummary(opts: HarnessSummaryRulesInput): HarnessSummary {
  const status = deriveStatus(opts.metrics.viewBox, opts.metrics.rootChildCount, opts.findings)
  const next_action = deriveNextAction(status, opts.artifacts.browser_png)
  const pipeline = derivePipeline(opts.artifacts)
  const top_findings = deriveTopFindings(opts.findings)
  const scores = deriveScores(status, opts.findings)
  const judgeArtifacts = collectJudgeArtifacts(opts.artifacts)

  return {
    run_id: opts.run_id,
    case_id: opts.case_id,
    diagram_type: opts.diagram_type,
    status,
    pipeline,
    artifacts: opts.artifacts,
    scores,
    top_findings,
    next_action,
    judge: {
      required: status === 'suspicious' && opts.artifacts.browser_png !== null,
      inputs: {
        artifacts: judgeArtifacts,
      },
    },
  }
}

export function deriveStatus(
  viewBox: unknown | null,
  rootChildCount: number | null | undefined,
  findings: Array<Partial<HarnessFinding> & { message?: string }>,
): HarnessStatus {
  if (!viewBox || rootChildCount === 0) return 'fail'
  return findings.length > 0 ? 'suspicious' : 'ok'
}

function deriveNextAction(status: HarnessStatus, browserPng: string | null) {
  if (status === 'ok') return 'done'
  if (status === 'fail') return 'repair_and_rerun'
  return browserPng ? 'human_review_or_visual_judge' : 'capture_browser'
}

function derivePipeline(artifacts: SummaryArtifacts) {
  const pipeline: string[] = []
  if (artifacts.svg) pipeline.push('render-svg')
  if (artifacts.metrics && artifacts.findings) pipeline.push('inspect-svg')
  if (artifacts.browser_png) pipeline.push('capture-browser')
  return pipeline
}

function deriveTopFindings(findings: Array<Partial<HarnessFinding> & { message?: string }>) {
  return findings.slice(0, 3).map(finding => finding.message?.trim() || 'unknown finding')
}

function deriveScores(status: HarnessStatus, findings: Array<Partial<HarnessFinding> & { message?: string }>): SummaryScores {
  if (status === 'fail') {
    return {
      legibility: 0,
      structural_clarity: 0,
      spatial_balance: null,
      visual_taste: null,
    }
  }

  if (findings.length === 0) {
    return {
      legibility: 3,
      structural_clarity: 3,
      spatial_balance: 3,
      visual_taste: null,
    }
  }

  return {
    legibility: 2,
    structural_clarity: 2,
    spatial_balance: null,
    visual_taste: null,
  }
}

function collectJudgeArtifacts(artifacts: SummaryArtifacts) {
  return [artifacts.svg, artifacts.browser_png, artifacts.findings, artifacts.dom_html].filter(
    (artifact): artifact is string => artifact !== null,
  )
}
