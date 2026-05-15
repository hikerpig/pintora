import type { HarnessReviewAdapter, HarnessReviewAdapterName } from './review-contracts'
import { manualReviewPackAdapter } from './adapters/manual-review-pack'
import { noopReviewAdapter } from './adapters/noop'

const ADAPTERS: Record<HarnessReviewAdapterName, HarnessReviewAdapter> = {
  'manual-review-pack': manualReviewPackAdapter,
  noop: noopReviewAdapter,
}

export function resolveHarnessReviewAdapter(name: string): HarnessReviewAdapter {
  const adapter = ADAPTERS[name as HarnessReviewAdapterName]
  if (!adapter) {
    throw new Error(`Unknown harness review adapter: ${name}`)
  }
  return adapter
}
