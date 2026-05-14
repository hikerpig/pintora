import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runHarnessCase } from '../orchestration/run-case'
import { runHarnessSuite } from '../orchestration/run-suite'

jest.mock('../orchestration/run-case', () => ({
  runHarnessCase: jest.fn(),
}))

const mockedRunHarnessCase = jest.mocked(runHarnessCase)

describe('runHarnessSuite', () => {
  beforeEach(() => {
    mockedRunHarnessCase
      .mockReset()
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
      })
  })

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

  it('reads review-decision.json and aggregates review counts', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-suite-'))

    const caseA = path.join(artifactsDir, 'er.relationship-spacing-01')
    fs.mkdirSync(caseA, { recursive: true })
    fs.writeFileSync(
      path.join(caseA, 'review-decision.json'),
      JSON.stringify({ next_step: { type: 'accept' } })
    )

    const caseB = path.join(artifactsDir, 'sequence.lifeline-label-separation-01')
    fs.mkdirSync(caseB, { recursive: true })
    fs.writeFileSync(
      path.join(caseB, 'review-decision.json'),
      JSON.stringify({ next_step: { type: 'repair' } })
    )

    const result = await runHarnessSuite({
      cwd: process.cwd(),
      suite: 'smoke',
      artifactsDir,
      enableCaptureBrowser: true,
      maxConcurrency: 1,
    })

    expect(result.total).toBe(2)
    expect(result.accepted).toBe(1)
    expect(result.needsRepair).toBe(1)
    expect(result.reviewPending).toBe(0)
  })

  it('runs cases concurrently up to maxConcurrency', async () => {
    const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pintora-harness-suite-'))
    let releaseFirst: (() => void) | undefined

    mockedRunHarnessCase.mockReset()
    mockedRunHarnessCase.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          releaseFirst = () =>
            resolve({
              status: 'ok',
              nextAction: 'done',
              artifactsDir: '/tmp/one',
              summary: 'summary.json',
              captureBrowserTriggered: false,
            })
        }),
    )
    mockedRunHarnessCase.mockResolvedValueOnce({
      status: 'ok',
      nextAction: 'done',
      artifactsDir: '/tmp/two',
      summary: 'summary.json',
      captureBrowserTriggered: false,
    })

    const suitePromise = runHarnessSuite({
      cwd: process.cwd(),
      suite: 'smoke',
      artifactsDir,
      enableCaptureBrowser: true,
      maxConcurrency: 2,
    })

    await Promise.resolve()
    expect(mockedRunHarnessCase).toHaveBeenCalledTimes(2)

    releaseFirst?.()
    const result = await suitePromise

    expect(result.cases.map(item => item.caseId)).toEqual([
      'er.relationship-spacing-01',
      'sequence.lifeline-label-separation-01',
    ])
  })
})
