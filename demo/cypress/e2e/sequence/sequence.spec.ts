/// <reference types="@percy/cypress" />
import { EXAMPLES } from '@pintora/test-shared'
import { makeSnapshotCases, startRender } from '../test-utils/render'

describe('Sequence Diagram', () => {
  it('renders', () => {
    const c = startRender({ code: EXAMPLES.sequence.code })
    c.get('svg .sequence__actor').should('exist') // svg

    cy.percySnapshot()
  })

  makeSnapshotCases([
    {
      description: 'excessive box width bug, #153',
      code: `
      sequenceDiagram
      participant service_2 as "Service 2"
      participant service_3 as "Service 3"
      participant service_4 as "Service 4"

      par one
        service_2->>service_3: random
        service_4->>service_4: problem
      end
      `,
    },
  ])
})
