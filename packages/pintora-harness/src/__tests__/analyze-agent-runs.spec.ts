import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessAnalyzeAgentRuns } from '../activity/analyze-agent-runs'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function writeRunFixture(
  root: string,
  runId: string,
  options: {
    harness: 'ok' | 'suspicious' | 'fail'
    events?: unknown[]
    omitActivity?: boolean
  },
) {
  const runDir = path.join(root, runId)
  writeJson(path.join(runDir, 'manifest.json'), {
    schema_version: 1,
    run_id: runId,
    created_at: '2026-05-19T10:00:00.000Z',
    repo: 'pintora',
    workspace: process.cwd(),
    agent: { name: 'codex', model: 'gpt-5', session_id: null },
    task: { title: 'Analyze agent activity', source: 'user', scope: ['packages/pintora-harness'] },
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
      harness: options.harness,
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
  writeJson(path.join(runDir, 'harness/suite.json'), {
    suite: 'smoke',
    total: 1,
    ok: options.harness === 'ok' ? 1 : 0,
    suspicious: options.harness === 'suspicious' ? 1 : 0,
    fail: options.harness === 'fail' ? 1 : 0,
    captureBrowserTriggeredCount: 0,
    accepted: 0,
    needsRepair: 0,
    needsRerun: 0,
    escalated: 0,
    reviewPending: 0,
    cases: [],
  })

  if (!options.omitActivity) {
    fs.writeFileSync(
      path.join(runDir, 'agent-events.ndjson'),
      (options.events || []).map(event => (typeof event === 'string' ? event : JSON.stringify(event))).join('\n') +
        '\n',
    )
  }
}

describe('runHarnessAnalyzeAgentRuns', () => {
  it('aggregates constraint observance, frequent gaps, course corrections, malformed events, and non-ok correlations', async () => {
    const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-agent-runs-'))
    writeRunFixture(runsDir, 'run-observed', {
      harness: 'ok',
      events: [
        {
          schema_version: 1,
          ts: '2026-05-19T10:00:00.000Z',
          kind: 'constraint_check',
          phase: 'context',
          summary: 'Package AGENTS.md was read before edits.',
          data: { constraint_id: 'package-agents-before-edit', status: 'observed' },
        },
        {
          schema_version: 1,
          ts: '2026-05-19T10:01:00.000Z',
          kind: 'course_correction',
          phase: 'verification',
          summary: 'Fixed TypeScript errors after compile failed.',
          data: { trigger: 'compile failure', next_action: 'fix typing before harness' },
        },
      ],
    })
    writeRunFixture(runsDir, 'run-missed-non-ok', {
      harness: 'suspicious',
      events: [
        {
          schema_version: 1,
          ts: '2026-05-19T10:02:00.000Z',
          kind: 'constraint_check',
          phase: 'verification',
          summary: 'No rule says when to run compare-runs.',
          data: {
            constraint_id: 'compare-runs-workflow',
            status: 'missed',
            evidence: 'The workflow had to be inferred.',
          },
        },
        {
          schema_version: 1,
          ts: '2026-05-19T10:03:00.000Z',
          kind: 'course_correction',
          phase: 'verification',
          summary: 'Fixed TypeScript errors after compile failed.',
          data: { trigger: 'compile failure', next_action: 'fix typing before harness' },
        },
      ],
    })
    writeRunFixture(runsDir, 'run-conflicted', {
      harness: 'fail',
      events: [
        '{',
        {
          schema_version: 1,
          ts: '2026-05-19T10:04:00.000Z',
          kind: 'constraint_check',
          phase: 'planning',
          summary: 'Skill approval gate conflicted with explicit continue request.',
          data: {
            constraint_id: 'skill-approval-gate',
            status: 'conflicted',
            evidence: 'User approved continuation after design discussion.',
          },
        },
        {
          schema_version: 1,
          ts: '2026-05-19T10:05:00.000Z',
          kind: 'course_correction',
          phase: 'verification',
          summary: 'Reran focused tests after CLI wiring changed.',
          data: { trigger: 'cli wiring change', next_action: 'rerun focused tests' },
        },
      ],
    })
    writeRunFixture(runsDir, 'run-missing-activity', {
      harness: 'ok',
      omitActivity: true,
    })
    const outFile = path.join(runsDir, 'report.json')

    const result = await runHarnessAnalyzeAgentRuns({ runsDir, outFile })

    expect(result).toEqual({
      status: 'completed',
      report: 'report.json',
      totalRuns: 4,
    })

    const report = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    expect(report.total_runs).toBe(4)
    expect(report.runs_with_activity).toBe(3)
    expect(report.runs_missing_activity).toBe(1)
    expect(report.constraint_observance).toEqual([
      {
        constraint_id: 'compare-runs-workflow',
        observed: 0,
        missed: 1,
        conflicted: 0,
        not_applicable: 0,
        unknown: 0,
      },
      {
        constraint_id: 'package-agents-before-edit',
        observed: 1,
        missed: 0,
        conflicted: 0,
        not_applicable: 0,
        unknown: 0,
      },
      {
        constraint_id: 'skill-approval-gate',
        observed: 0,
        missed: 0,
        conflicted: 1,
        not_applicable: 0,
        unknown: 0,
      },
    ])
    expect(report.frequent_gaps).toEqual([
      {
        title: 'No rule says when to run compare-runs.',
        count: 1,
        evidence_runs: ['run-missed-non-ok'],
      },
      {
        title: 'Skill approval gate conflicted with explicit continue request.',
        count: 1,
        evidence_runs: ['run-conflicted'],
      },
    ])
    expect(report.course_correction_patterns).toEqual([
      {
        trigger: 'compile failure',
        count: 2,
        common_next_action: 'fix typing before harness',
      },
      {
        trigger: 'cli wiring change',
        count: 1,
        common_next_action: 'rerun focused tests',
      },
    ])
    expect(report.constraint_failure_correlation).toEqual([
      {
        constraint_id: 'compare-runs-workflow',
        non_ok_harness_runs: 1,
        sample_runs: ['run-missed-non-ok'],
      },
      {
        constraint_id: 'skill-approval-gate',
        non_ok_harness_runs: 1,
        sample_runs: ['run-conflicted'],
      },
    ])
    expect(report.warnings).toEqual([
      {
        run_id: 'run-conflicted',
        file: 'agent-events.ndjson',
        message: 'Skipped malformed activity event line 1',
      },
    ])
  })
})
