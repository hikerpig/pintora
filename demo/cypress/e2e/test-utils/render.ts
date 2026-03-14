/// <reference types="@percy/cypress" />
import { encodeForUrl } from '@pintora/core'

export interface RenderOptions {
  code: string
  theme?: string
  renderer?: 'svg' | 'canvas'
}

export function startRender(opts: RenderOptions) {
  const { code, theme = 'default', renderer = 'svg' } = opts
  const DEMO_HOST = 'http://localhost:3001'
  const encodedCode = encodeForUrl(code)

  // Encode theme config as part of URL params
  const config = JSON.stringify({
    themeConfig: {
      theme,
    },
    core: {
      defaultRenderer: renderer,
    },
  })
  const encodedConfig = encodeForUrl(config)

  const demoUrl = `${DEMO_HOST}/demo/preview/?code=${encodedCode}&config=${encodedConfig}&e2e=true`
  return cy.visit(demoUrl)
}

export type SnapshotCaseItem = {
  description: string
  code: string
  existSelectors?: string[]
  onRender?(c: ReturnType<typeof startRender>): void
}

export function makeSnapshotCases(items: SnapshotCaseItem[]) {
  items.forEach(item => {
    it(item.description, function () {
      const c = startRender({ code: item.code })
      c.get('svg').should('exist') // svg

      if (item.onRender) item.onRender(c)

      if (item.existSelectors) {
        item.existSelectors.forEach(selector => {
          c.get(selector).should('exist')
        })
      }

      cy.percySnapshot()
    })
  })
}
