import { buildBrowserPreviewUrl, DEFAULT_PREVIEW_BASE_URL } from '../browser/browser-preview-url'

describe('buildBrowserPreviewUrl', () => {
  it('uses the default preview base url and required params', () => {
    const code = 'erDiagram\n  A ||--o{ B : owns'
    const url = buildBrowserPreviewUrl({
      code,
    })
    const parsedUrl = new URL(url)

    expect(url.startsWith(DEFAULT_PREVIEW_BASE_URL)).toBe(true)
    expect(url).toContain('renderer=svg')
    expect(url).toContain('e2e=true')
    expect(url).toContain('code=')
    expect(unescape(atob(decodeURIComponent(parsedUrl.searchParams.get('code') || '')))).toBe(code)
  })

  it('honors an explicit base url override', () => {
    const url = buildBrowserPreviewUrl({
      code: 'sequenceDiagram\n  a->>b: ping',
      baseUrl: 'http://127.0.0.1:4010/demo/preview/',
    })

    expect(url.startsWith('http://127.0.0.1:4010/demo/preview/')).toBe(true)
  })
})
