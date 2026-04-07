import * as fs from 'node:fs'
import * as path from 'node:path'
import { buildHarnessReviewPayload } from './review-payload'
import { resolveHarnessReviewAdapter } from './review-adapter'
import type {
  HarnessReviewAdapterName,
  HarnessReviewResult,
  RunHarnessReviewCaseResult,
} from './review-contracts'

function assertArtifactsDirExists(artifactsDir: string) {
  if (!fs.existsSync(artifactsDir)) {
    throw new Error(`Artifacts directory does not exist: ${artifactsDir}`)
  }
}

function assertValidReviewResult(result: HarnessReviewResult) {
  if (result.status !== 'completed' && result.status !== 'failed') {
    throw new Error(`Invalid review result status: ${result.status}`)
  }
}

export async function runHarnessReviewCase(opts: {
  artifactsDir: string
  adapter: HarnessReviewAdapterName
  outFile: string
  packDir?: string
  cwd?: string
}): Promise<RunHarnessReviewCaseResult> {
  assertArtifactsDirExists(opts.artifactsDir)

  const payload = buildHarnessReviewPayload({ artifactsDir: opts.artifactsDir })
  const adapter = resolveHarnessReviewAdapter(opts.adapter)
  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true })
  const result = await adapter.run({
    artifactsDir: opts.artifactsDir,
    payload,
    outFile: opts.outFile,
    packDir: opts.packDir,
  })

  assertValidReviewResult(result)

  fs.writeFileSync(opts.outFile, JSON.stringify(result, null, 2))

  return {
    adapter: result.adapter,
    status: result.status,
    verdict: result.verdict,
    review: path.basename(opts.outFile),
  }
}
