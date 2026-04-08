import * as fs from 'node:fs'
import * as path from 'node:path'
import { readHarnessArtifacts } from './artifact-reader'
import { statusToExitCode } from './exit-codes'
import { buildHarnessSummary } from './summary-rules'

export async function runHarnessSummarizeCase(opts: { artifactsDir: string; outFile: string }) {
  const { artifacts, findings, metrics } = readHarnessArtifacts({ artifactsDir: opts.artifactsDir })
  const summaryData = buildHarnessSummary({
    run_id: path.basename(opts.artifactsDir),
    case_id: null,
    diagram_type: null,
    artifacts,
    metrics,
    findings,
  })

  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  fs.writeFileSync(opts.outFile, JSON.stringify(summaryData, null, 2))

  const exitCode = statusToExitCode(summaryData.status)

  return {
    status: summaryData.status,
    nextAction: summaryData.next_action,
    summary: path.basename(opts.outFile),
    exitCode,
  }
}
