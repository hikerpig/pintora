import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessCompareRuns } from '../analysis/compare-runs'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function writeRunFixture(
  root: string,
  runId: string,
  options: {
    cases: Array<{
      caseId: string
      status: 'ok' | 'suspicious' | 'fail'
      failureSignature: string | null
    }>
    commands: Array<{
      phase: 'build' | 'test' | 'harness'
      cmd: string
      exit_code: number
      summary: string
    }>
    decisions?: unknown[]
  },
) {
  const runDir = path.join(root, runId)
  writeJson(path.join(runDir, 'manifest.json'), {
    schema_version: 1,
    run_id: runId,
    created_at: '2026-05-18T10:00:00.000Z',
    repo: 'pintora',
    workspace: process.cwd(),
    agent: { name: 'codex', model: 'gpt-5', session_id: null },
    task: { title: 'Compare runs', source: 'user', scope: ['packages/pintora-harness'] },
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
      harness: options.cases.some(item => item.status === 'fail')
        ? 'fail'
        : options.cases.some(item => item.status === 'suspicious')
        ? 'suspicious'
        : 'ok',
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
    path.join(runDir, 'commands.ndjson'),
    options.commands
      .map(command =>
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:00:00.000Z',
          cwd: process.cwd(),
          duration_ms: 1,
          ...command,
        }),
      )
      .join('\n') + '\n',
  )
  fs.writeFileSync(
    path.join(runDir, 'decisions.ndjson'),
    (options.decisions || []).map(item => JSON.stringify(item)).join('\n'),
  )

  writeJson(path.join(runDir, 'harness/suite.json'), {
    suite: 'smoke',
    total: options.cases.length,
    ok: options.cases.filter(item => item.status === 'ok').length,
    suspicious: options.cases.filter(item => item.status === 'suspicious').length,
    fail: options.cases.filter(item => item.status === 'fail').length,
    captureBrowserTriggeredCount: 0,
    accepted: 0,
    needsRepair: 0,
    needsRerun: 0,
    escalated: 0,
    reviewPending: 0,
    cases: options.cases.map(item => ({
      caseId: item.caseId,
      status: item.status,
      summary: `${item.caseId}/summary.json`,
      captureBrowserTriggered: false,
    })),
  })

  for (const item of options.cases) {
    writeJson(path.join(runDir, `harness/${item.caseId}/summary.json`), {
      run_id: item.caseId,
      case_id: item.caseId,
      diagram_type: item.caseId.split('.')[0],
      status: item.status,
      failure_signature: item.failureSignature,
      suspected_component: null,
      top_findings: item.failureSignature ? [item.failureSignature] : [],
      next_action: item.status === 'ok' ? 'done' : 'human_review_or_visual_judge',
    })
  }
}

describe('runHarnessCompareRuns', () => {
  it('reports case transitions, finding changes, command changes, missing cases, and prediction quality', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-compare-runs-'))
    writeRunFixture(root, 'base-run', {
      cases: [
        {
          caseId: 'er.relationship-spacing-01',
          status: 'suspicious',
          failureSignature: 'er.entity-border-clearance',
        },
        {
          caseId: 'sequence.lifeline-label-separation-01',
          status: 'ok',
          failureSignature: null,
        },
        {
          caseId: 'er.removed-case-01',
          status: 'ok',
          failureSignature: null,
        },
      ],
      commands: [
        { phase: 'build', cmd: 'pnpm compile', exit_code: 0, summary: 'compile' },
        { phase: 'harness', cmd: 'runHarnessSuite smoke', exit_code: 10, summary: '1 ok, 1 suspicious, 0 fail' },
      ],
    })
    writeRunFixture(root, 'head-run', {
      cases: [
        {
          caseId: 'er.relationship-spacing-01',
          status: 'ok',
          failureSignature: null,
        },
        {
          caseId: 'sequence.lifeline-label-separation-01',
          status: 'fail',
          failureSignature: 'sequence.svg-structure-fail',
        },
        {
          caseId: 'sequence.added-case-01',
          status: 'ok',
          failureSignature: null,
        },
      ],
      commands: [
        { phase: 'build', cmd: 'pnpm compile', exit_code: 0, summary: 'compile' },
        { phase: 'harness', cmd: 'runHarnessSuite smoke', exit_code: 20, summary: '2 ok, 0 suspicious, 1 fail' },
      ],
      decisions: [
        {
          schema_version: 1,
          kind: 'prediction',
          id: 'prediction-001',
          claim: 'ER spacing should improve without sequence regressions.',
          expected_improve: ['er.relationship-spacing-01'],
          expected_unchanged: ['sequence.lifeline-label-separation-01'],
        },
      ],
    })

    const report = await runHarnessCompareRuns({
      baseRunDir: path.join(root, 'base-run'),
      headRunDir: path.join(root, 'head-run'),
    })

    expect(report.base).toBe('base-run')
    expect(report.head).toBe('head-run')
    expect(report.improved).toEqual([{ case_id: 'er.relationship-spacing-01', from: 'suspicious', to: 'ok' }])
    expect(report.regressed).toEqual([{ case_id: 'sequence.lifeline-label-separation-01', from: 'ok', to: 'fail' }])
    expect(report.missing).toEqual([
      { case_id: 'er.removed-case-01', missing_from: 'head' },
      { case_id: 'sequence.added-case-01', missing_from: 'base' },
    ])
    expect(report.finding_changes).toEqual([
      { case_id: 'er.relationship-spacing-01', from: 'er.entity-border-clearance', to: null },
      { case_id: 'sequence.lifeline-label-separation-01', from: null, to: 'sequence.svg-structure-fail' },
    ])
    expect(report.command_changes).toEqual([
      {
        command: 'runHarnessSuite smoke',
        phase: 'harness',
        base_exit_code: 10,
        head_exit_code: 20,
        base_summary: '1 ok, 1 suspicious, 0 fail',
        head_summary: '2 ok, 0 suspicious, 1 fail',
      },
    ])
    expect(report.prediction_results).toEqual([
      {
        prediction_ref: 'prediction-001',
        result: 'disconfirmed',
        evidence: [
          'er.relationship-spacing-01: suspicious -> ok improved',
          'sequence.lifeline-label-separation-01: ok -> fail regressed',
        ],
      },
    ])
    expect(report.prediction_quality).toEqual({
      confirmed: 0,
      partially_confirmed: 0,
      disconfirmed: 1,
      inconclusive: 0,
      pending: 0,
    })
  })
})
