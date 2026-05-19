import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSummarizeAgentRun } from '../activity/summarize-agent-run'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

describe('runHarnessSummarizeAgentRun', () => {
  it('writes agent summary and constraint gap reports from activity events', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-agent-summary-'))
    writeJson(path.join(runDir, 'manifest.json'), {
      schema_version: 1,
      run_id: 'run-one',
      task: { title: 'Add agent activity trace' },
      outcome: {
        compile: 'pass',
        unit_tests: 'pass',
        harness: 'ok',
        review: 'not_run',
      },
    })
    writeJson(path.join(runDir, 'constraints.json'), {
      schema_version: 1,
      constraints: [
        {
          id: 'package-agents-before-edit',
          source: 'AGENTS.md',
          text: 'Before editing inside a package, read its AGENTS.md.',
          scope: ['packages/*'],
          severity: 'must',
        },
      ],
    })
    fs.writeFileSync(
      path.join(runDir, 'agent-events.ndjson'),
      [
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:00:00.000Z',
          kind: 'context_read',
          phase: 'context',
          summary: 'Read packages/pintora-harness/AGENTS.md.',
          data: { evidence_refs: ['packages/pintora-harness/AGENTS.md'] },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:01:00.000Z',
          kind: 'constraint_check',
          phase: 'context',
          summary: 'Package AGENTS.md was read before edits.',
          data: {
            constraint_id: 'package-agents-before-edit',
            status: 'observed',
            evidence: 'Read package instructions first.',
          },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:02:00.000Z',
          kind: 'constraint_check',
          phase: 'verification',
          summary: 'No rule tells agents when to run compare-runs.',
          data: {
            constraint_id: 'compare-runs-workflow',
            status: 'missed',
            evidence: 'The workflow had to be inferred from the design document.',
          },
        }),
        JSON.stringify({
          schema_version: 1,
          ts: '2026-05-18T10:03:00.000Z',
          kind: 'course_correction',
          phase: 'verification',
          summary: 'Fixed TypeScript errors after compile failed.',
          data: { trigger: 'compile failure', next_action: 'fix typing before harness' },
        }),
      ].join('\n') + '\n',
    )

    const result = await runHarnessSummarizeAgentRun({ runDir })

    expect(result).toEqual({
      status: 'completed',
      summary: 'agent-summary.md',
      gaps: 'constraint-gaps.md',
    })
    const summary = fs.readFileSync(path.join(runDir, 'agent-summary.md'), 'utf8')
    expect(summary).toContain('# Agent Summary: run-one')
    expect(summary).toContain('Task: Add agent activity trace')
    expect(summary).toContain('context_read: Read packages/pintora-harness/AGENTS.md.')
    expect(summary).toContain('package-agents-before-edit: observed')
    expect(summary).toContain('Fixed TypeScript errors after compile failed.')

    const gaps = fs.readFileSync(path.join(runDir, 'constraint-gaps.md'), 'utf8')
    expect(gaps).toContain('# Constraint Gaps: run-one')
    expect(gaps).toContain('compare-runs-workflow')
    expect(gaps).toContain('No rule tells agents when to run compare-runs.')
  })
})
