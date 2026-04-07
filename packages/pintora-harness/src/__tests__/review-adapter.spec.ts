import { resolveHarnessReviewAdapter } from '../review/review-adapter'

describe('resolveHarnessReviewAdapter', () => {
  it('resolves the built-in manual-review-pack adapter', () => {
    expect(resolveHarnessReviewAdapter('manual-review-pack').name).toBe('manual-review-pack')
  })

  it('resolves the built-in noop adapter', () => {
    expect(resolveHarnessReviewAdapter('noop').name).toBe('noop')
  })

  it('throws for an unknown adapter name', () => {
    expect(() => resolveHarnessReviewAdapter('unknown' as never)).toThrow(
      'Unknown harness review adapter: unknown',
    )
  })
})
