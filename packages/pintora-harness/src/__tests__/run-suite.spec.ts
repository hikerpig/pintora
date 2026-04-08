import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessSuite } from '../orchestration/run-suite'

jest.mock('../orchestration/run-case', () => ({
  runHarnessCase: jest
    .fn()
    .mockResolvedValueOnce({
      status: 'ok',
      nextAction: 'done',
      artifactsDir: '/tmp/one',
      summary: 'summary.json',
      captureBrowserTriggered: false,
    })
    .mockResolvedValueOnce({
      status: 'suspicious',
      nextAction: 'capture_browser',
      artifactsDir: '/tmp/two',
      summary: 'summary.json',
      captureBrowserTriggered: true,
    }),
}))

describe('runHarnessSuite', () => {
  it('aggregates case results and writes suite.json', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-suite-'))

    const result = await runHarnessSuite({
      cwd: process.cwd(),
      suite: 'smoke',
      artifactsDir,
      enableCaptureBrowser: true,
      maxConcurrency: 1,
    })

    expect(result.total).toBe(2)
    expect(result.ok).toBe(1)
    expect(result.suspicious).toBe(1)
    expect(result.fail).toBe(0)
    expect(result.captureBrowserTriggeredCount).toBe(1)
    expect(fs.existsSync(path.join(artifactsDir, 'suite.json'))).toBe(true)
  })
})
