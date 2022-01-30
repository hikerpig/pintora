/// <reference types="@percy/cypress" />
import { EXAMPLES } from '@pintora/test-shared'
import { startRender } from '../test-utils/render'

describe('Sequence Diagram', () => {
  it('renders', () => {
    const c = startRender({ code: EXAMPLES.sequence.code })
    c.get('svg .actor').should('exist') // svg

    cy.percySnapshot()
  })
})
