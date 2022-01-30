import { encodeForUrl } from '@pintora/core'

export function startRender(opts: { code: string }) {
  const { code } = opts
  const DEMO_HOST = 'http://localhost:3001'
  const encodedCode = encodeForUrl(code)
  const demoUrl = `${DEMO_HOST}/demo/preview/?code=${encodedCode}`
  return cy.visit(demoUrl)
}

export type SnapshotCaseItem = {
  description: string
  code: string
  onRender?(c: ReturnType<typeof startRender>): void
}

export function makeSnapshotCases(items: SnapshotCaseItem[]) {
  items.forEach(item => {
    it(item.description, function () {
      const c = startRender({ code: item.code })
      c.get('svg').should('exist') // svg

      if (item.onRender) item.onRender(c)

      cy.percySnapshot()
    })
  })
}
