import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSummarizeCase } from '../summary/summarize-case'

function writeSummaryArtifacts() {
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-summary-'))
  fs.writeFileSync(
    path.join(artifactsDir, 'metrics.json'),
    JSON.stringify(
      {
        viewBox: { x: 0, y: 0, width: 100, height: 80 },
        rootChildCount: 1,
      },
      null,
      2,
    ),
  )
  fs.writeFileSync(path.join(artifactsDir, 'findings.json'), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')
  return artifactsDir
}

describe('runHarnessSummarizeCase', () => {
  it('writes summary.json and returns the summary file metadata', async () => {
    const artifactsDir = writeSummaryArtifacts()
    const outFile = path.join(artifactsDir, 'summary.json')

    const result = await runHarnessSummarizeCase({
      artifactsDir,
      outFile,
    })

    expect(result.status).toBe('ok')
    expect(result.nextAction).toBe('done')
    expect(result.exitCode).toBe(0)
    expect(result.summary).toBe('summary.json')
    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toMatchObject({
      run_id: path.basename(artifactsDir),
      case_id: null,
      diagram_type: null,
      failure_signature: null,
      suspected_component: null,
      status: 'ok',
      next_action: 'done',
    })
  })

  it('writes case metadata and derived failure signature when caseId is provided', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-summary-'))
    const outFile = path.join(artifactsDir, 'summary.json')
    fs.writeFileSync(
      path.join(artifactsDir, 'metrics.json'),
      JSON.stringify(
        {
          viewBox: { x: 0, y: 0, width: 100, height: 80 },
          rootChildCount: 1,
        },
        null,
        2,
      ),
    )
    fs.writeFileSync(
      path.join(artifactsDir, 'findings.json'),
      JSON.stringify(
        [
          {
            id: 'relationship-label-lane-overlap',
            severity: 'warning',
            message: 'relationship label overlaps the lane',
          },
        ],
        null,
        2,
      ),
    )
    fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')

    await runHarnessSummarizeCase({
      cwd: process.cwd(),
      caseId: 'er.relationship-spacing-01',
      artifactsDir,
      outFile,
    })

    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toMatchObject({
      case_id: 'er.relationship-spacing-01',
      diagram_type: 'er',
      failure_signature: 'er.relationship-label-lane-overlap',
      suspected_component: 'packages/pintora-diagrams/src/er',
    })
  })

  it.each([
    ['registry-relative', 'er/relationship-spacing-01.pintora'],
    ['harness/cases relative', 'harness/cases/er/relationship-spacing-01.pintora'],
    ['absolute', path.resolve(process.cwd(), '../../harness/cases/er/relationship-spacing-01.pintora')],
  ])('resolves case metadata from %s inputFile', async (_label, inputFile) => {
    const artifactsDir = writeSummaryArtifacts()
    const outFile = path.join(artifactsDir, 'summary.json')

    await runHarnessSummarizeCase({
      cwd: process.cwd(),
      inputFile,
      artifactsDir,
      outFile,
    })

    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toMatchObject({
      case_id: 'er.relationship-spacing-01',
      diagram_type: 'er',
      failure_signature: null,
      suspected_component: 'packages/pintora-diagrams/src/er',
    })
  })
})
