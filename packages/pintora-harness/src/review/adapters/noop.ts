import type { HarnessReviewAdapter } from '../review-contracts'
import { writePackDirPayload } from './pack-dir'

export const noopReviewAdapter: HarnessReviewAdapter = {
  name: 'noop',
  async run(input) {
    const base = {
      adapter: 'noop' as const,
      status: 'completed' as const,
      verdict: 'inconclusive' as const,
      confidence: null,
      summary: 'no review adapter work was performed',
    }

    if (!input.packDir) {
      return { ...base, artifacts: {} }
    }

    const { relativePackDir } = writePackDirPayload({
      artifactsDir: input.artifactsDir,
      packDir: input.packDir,
      payload: input.payload,
    })
    return { ...base, artifacts: { pack_dir: relativePackDir } }
  },
}
