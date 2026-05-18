import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessAnalyzeRuns } from '../analysis/analyze-runs'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function writeRunFixture(root: string, runId: string) {
  const runDir = path.join(root, runId)
  writeJson(path.join(runDir, 'manifest.json'), {
    schema_version: 1,
    run_id: runId,
    created_at: '2026-05-17T10:52:00.000Z',
    repo: 'pintora',
    workspace: process.cwd(),
    agent: { name: 'codex', model: 'gpt-5', session_id: null },
    task: { title: 'Improve ER labels', source: 'user', scope: ['packages/pintora-diagrams/src/er'] },
    git: {
      branch: 'feat-agent-observability',
      commit_before: 'aaa',
      commit_after: 'bbb',
      dirty_before: false,
      dirty_after: true,
      git_before_diff: 'git-before.diff',
      git_after_diff: 'git-after.diff',
    },
    outcome: {
      compile: 'pass',
      unit_tests: 'pass',
      harness: 'suspicious',
      review: 'not_run',
    },
    artifacts: {
      task: 'task.md',
      env: 'env.json',
      commands: 'commands.ndjson',
      decisions: 'decisions.ndjson',
      harness: 'harness/suite.json',
      analysis: 'analysis.md',
    },
    incomplete_reason: null,
  })
  fs.writeFileSync(
    path.join(runDir, 'decisions.ndjson'),
    [
      JSON.stringify({
        schema_version: 1,
        kind: 'prediction',
        id: 'prediction-001',
        expected_improve: ['er.relationship-label-lane-01'],
        expected_unchanged: ['er.relationship-spacing-01'],
        claim: 'ER label lane should improve',
      }),
      JSON.stringify({
        schema_version: 1,
        kind: 'prediction_result',
        prediction_ref: 'prediction-001',
        result: 'confirmed',
        evidence: ['er.relationship-label-lane-01 moved suspicious -> ok'],
      }),
    ].join('\n') + '\n',
  )
  fs.writeFileSync(
    path.join(runDir, 'git-after.diff'),
    'diff --git a/packages/pintora-diagrams/src/er/foo.ts b/packages/pintora-diagrams/src/er/foo.ts\n',
  )
  writeJson(path.join(runDir, 'harness/suite.json'), {
    suite: 'smoke',
    total: 2,
    ok: 1,
    suspicious: 1,
    fail: 0,
    captureBrowserTriggeredCount: 0,
    accepted: 0,
    needsRepair: 0,
    needsRerun: 0,
    escalated: 0,
    reviewPending: 1,
    cases: [
      {
        caseId: 'er.relationship-label-lane-01',
        status: 'suspicious',
        summary: 'er.relationship-label-lane-01/summary.json',
        captureBrowserTriggered: false,
      },
      {
        caseId: 'sequence.lifeline-label-separation-01',
        status: 'ok',
        summary: 'sequence.lifeline-label-separation-01/summary.json',
        captureBrowserTriggered: false,
      },
    ],
  })
  writeJson(path.join(runDir, 'harness/er.relationship-label-lane-01/summary.json'), {
    run_id: 'er.relationship-label-lane-01',
    case_id: 'er.relationship-label-lane-01',
    diagram_type: 'er',
    status: 'suspicious',
    failure_signature: 'er.relationship-label-lane-overlap',
    suspected_component: 'packages/pintora-diagrams/src/er',
    top_findings: ['relationship label overlaps edge lane'],
  })
  writeJson(path.join(runDir, 'harness/sequence.lifeline-label-separation-01/summary.json'), {
    run_id: 'sequence.lifeline-label-separation-01',
    case_id: 'sequence.lifeline-label-separation-01',
    diagram_type: 'sequence',
    status: 'ok',
    failure_signature: null,
    suspected_component: 'packages/pintora-diagrams/src/sequence',
    top_findings: [],
  })
}

function writeReviewedNoiseFixture(
  root: string,
  runId: string,
  options: {
    reviewDecision: 'accept' | 'repair' | 'rerun' | 'escalate'
  },
) {
  const runDir = path.join(root, runId)
  writeJson(path.join(runDir, 'manifest.json'), {
    schema_version: 1,
    run_id: runId,
    created_at: '2026-05-17T10:52:00.000Z',
    repo: 'pintora',
    workspace: process.cwd(),
    agent: { name: 'codex', model: 'gpt-5', session_id: null },
    task: { title: 'Review noisy rule', source: 'user', scope: ['packages/pintora-harness'] },
    git: {
      branch: 'feat-agent-observability',
      commit_before: 'aaa',
      commit_after: 'bbb',
      dirty_before: false,
      dirty_after: true,
      git_before_diff: 'git-before.diff',
      git_after_diff: 'git-after.diff',
    },
    outcome: {
      compile: 'pass',
      unit_tests: 'pass',
      harness: 'suspicious',
      review: 'not_run',
    },
    artifacts: {
      task: 'task.md',
      env: 'env.json',
      commands: 'commands.ndjson',
      decisions: 'decisions.ndjson',
      harness: 'harness/suite.json',
      analysis: 'analysis.md',
    },
    incomplete_reason: null,
  })
  fs.writeFileSync(path.join(runDir, 'decisions.ndjson'), '')
  writeJson(path.join(runDir, 'harness/suite.json'), {
    suite: 'smoke',
    total: 1,
    ok: 0,
    suspicious: 1,
    fail: 0,
    captureBrowserTriggeredCount: 0,
    accepted: options.reviewDecision === 'accept' ? 1 : 0,
    needsRepair: options.reviewDecision === 'repair' ? 1 : 0,
    needsRerun: options.reviewDecision === 'rerun' ? 1 : 0,
    escalated: options.reviewDecision === 'escalate' ? 1 : 0,
    reviewPending: 0,
    cases: [
      {
        caseId: 'er.relationship-spacing-01',
        status: 'suspicious',
        summary: 'er.relationship-spacing-01/summary.json',
        captureBrowserTriggered: false,
        reviewDecision: options.reviewDecision,
      },
    ],
  })
  writeJson(path.join(runDir, 'harness/er.relationship-spacing-01/summary.json'), {
    run_id: 'er.relationship-spacing-01',
    case_id: 'er.relationship-spacing-01',
    diagram_type: 'er',
    status: 'suspicious',
    failure_signature: 'er.entity-border-clearance',
    suspected_component: 'packages/pintora-diagrams/src/er',
    top_findings: ['text is too close to the diagram edge for an ER case'],
  })
}

describe('runHarnessAnalyzeRuns', () => {
  it('aggregates case hotspots, finding hotspots, component risk, and prediction quality', async () => {
    const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-analyze-runs-'))
    writeRunFixture(runsDir, '20260517-er-labels')
    const outFile = path.join(runsDir, 'report.json')

    const result = await runHarnessAnalyzeRuns({
      runsDir,
      outFile,
    })

    expect(result.status).toBe('completed')
    expect(result.report).toBe(path.basename(outFile))

    const report = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(report.total_runs).toBe(1)
    expect(report.complete_runs).toBe(1)
    expect(report.incomplete_runs).toBe(0)
    expect(report.case_hotspots[0]).toMatchObject({
      case_id: 'er.relationship-label-lane-01',
      ok: 0,
      suspicious: 1,
      fail: 0,
    })
    expect(report.finding_hotspots[0]).toMatchObject({
      failure_signature: 'er.relationship-label-lane-overlap',
      count: 1,
    })
    expect(report.component_risk[0]).toMatchObject({
      path: 'packages/pintora-diagrams/src/er',
      regression_runs: 1,
    })
    expect(report.prediction_quality).toMatchObject({
      confirmed: 1,
      partially_confirmed: 0,
      disconfirmed: 0,
      inconclusive: 0,
      pending: 0,
    })
  })

  it('reports rule noise candidates after enough reviewed suspicious examples', async () => {
    const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-analyze-runs-noise-'))
    writeReviewedNoiseFixture(runsDir, 'run-accepted-1', { reviewDecision: 'accept' })
    writeReviewedNoiseFixture(runsDir, 'run-accepted-2', { reviewDecision: 'accept' })
    writeReviewedNoiseFixture(runsDir, 'run-accepted-3', { reviewDecision: 'accept' })
    writeReviewedNoiseFixture(runsDir, 'run-repair-1', { reviewDecision: 'repair' })
    writeReviewedNoiseFixture(runsDir, 'run-repair-2', { reviewDecision: 'repair' })
    const outFile = path.join(runsDir, 'report.json')

    await runHarnessAnalyzeRuns({
      runsDir,
      outFile,
    })

    const report = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(report.rule_noise_candidates).toEqual([
      {
        finding_code: 'er.entity-border-clearance',
        false_positive_rate: 0.6,
        sample_size: 5,
      },
    ])
  })
})
