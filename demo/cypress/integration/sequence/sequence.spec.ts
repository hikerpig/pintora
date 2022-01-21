/// <reference types="cypress" />
/// <reference types="@percy/cypress" />
import { encodeForUrl } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'

function startRender(opts: { code: string }) {
  const { code } = opts
  const DEMO_HOST = 'http://localhost:3001'
  const encodedCode = encodeForUrl(code)
  const demoUrl = `${DEMO_HOST}/demo/preview/?code=${encodedCode}`
  return cy.visit(demoUrl)
}

describe('Sequence Diagram', () => {
  it('renders', () => {
    const c = startRender({ code: EXAMPLES.sequence.code })
    c.get('svg .actor').should('exist') // svg

    cy.percySnapshot()
  })
})
