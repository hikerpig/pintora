import { encodeForUrl } from '@pintora/core'
import { DEFAULT_PREVIEW_BASE_URL } from '../contracts/browser'

export { DEFAULT_PREVIEW_BASE_URL } from '../contracts/browser'

export function buildBrowserPreviewUrl(opts: { code: string; baseUrl?: string }) {
  const baseUrl = opts.baseUrl || DEFAULT_PREVIEW_BASE_URL
  const url = new URL(baseUrl)
  url.searchParams.set('code', encodeForUrl(opts.code))
  url.searchParams.set('renderer', 'svg')
  url.searchParams.set('e2e', 'true')
  return url.toString()
}
