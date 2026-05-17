import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessBriefRun } from '../analysis/brief-run'

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

describe('runHarnessBriefRun', () => {
  it('writes a repair brief for a trace run', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-brief-run-'))
    writeJson(path.join(runDir, 'manifest.json'), {
      schema_version: 1,
      run_id: '20260517-er-labels',
      task: { title: 'Improve ER labels' },
      outcome: { compile: 'pass', unit_tests: 'pass', harness: 'suspicious', review: 'not_run' },
      artifacts: { harness: 'harness/suite.json', commands: 'commands.ndjson', decisions: 'decisions.ndjson' },
      incomplete_reason: null,
    })
    fs.writeFileSync(
      path.join(runDir, 'commands.ndjson'),
      JSON.stringify({
        phase: 'harness',
        cmd: 'runHarnessSuite smoke',
        exit_code: 10,
        summary: '1 ok, 1 suspicious, 0 fail',
      }) + '\n',
    )
    fs.writeFileSync(
      path.join(runDir, 'decisions.ndjson'),
      JSON.stringify({
        schema_version: 1,
        kind: 'prediction',
        id: 'prediction-001',
        claim: 'ER labels should improve',
        expected_improve: ['er.relationship-label-lane-01'],
        expected_unchanged: [],
      }) + '\n',
    )
    writeJson(path.join(runDir, 'harness/suite.json'), {
      suite: 'smoke',
      total: 1,
      ok: 0,
      suspicious: 1,
      fail: 0,
      cases: [
        {
          caseId: 'er.relationship-label-lane-01',
          status: 'suspicious',
          summary: 'er.relationship-label-lane-01/summary.json',
          captureBrowserTriggered: false,
        },
      ],
    })
    writeJson(path.join(runDir, 'harness/er.relationship-label-lane-01/summary.json'), {
      case_id: 'er.relationship-label-lane-01',
      diagram_type: 'er',
      status: 'suspicious',
      failure_signature: 'er.relationship-label-lane-overlap',
      suspected_component: 'packages/pintora-diagrams/src/er',
      top_findings: ['relationship label overlaps edge lane'],
      next_action: 'human_review_or_visual_judge',
    })
    fs.writeFileSync(
      path.join(runDir, 'git-after.diff'),
      'diff --git a/packages/pintora-diagrams/src/er/foo.ts b/packages/pintora-diagrams/src/er/foo.ts\n',
    )

    const outFile = path.join(runDir, 'repair-brief.md')
    const result = await runHarnessBriefRun({
      runDir,
      outFile,
    })

    expect(result).toEqual({
      status: 'completed',
      brief: 'repair-brief.md',
    })

    const brief = fs.readFileSync(outFile, 'utf8')
    expect(brief).toContain('# Repair Brief: 20260517-er-labels')
    expect(brief).toContain('Improve ER labels')
    expect(brief).toContain('er.relationship-label-lane-01')
    expect(brief).toContain('er.relationship-label-lane-overlap')
    expect(brief).toContain('packages/pintora-diagrams/src/er')
    expect(brief).toContain('ER labels should improve')
  })
})
