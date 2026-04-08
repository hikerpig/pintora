import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSummarizeCase } from '../summary/summarize-case'

describe('runHarnessSummarizeCase', () => {
  it('writes summary.json and returns the summary file metadata', async () => {
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
    fs.writeFileSync(path.join(artifactsDir, 'findings.json'), JSON.stringify([], null, 2))
    fs.writeFileSync(path.join(artifactsDir, 'render.svg'), '<svg></svg>')

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
      status: 'ok',
      next_action: 'done',
    })
  })
})
