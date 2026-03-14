/// <reference types="@percy/cypress" />
import { EXAMPLES } from '@pintora/test-shared'
import { themeRegistry } from '@pintora/core'
import { startRender } from '../test-utils/render'

// All available themes
// const THEMES = Object.keys(themeRegistry.themes)
const THEMES = Object.keys(themeRegistry.themes).slice(0, 2)

// All diagram types with examples
const DIAGRAM_TYPES = [
  { key: 'sequence', name: 'Sequence Diagram', code: EXAMPLES.sequence.code },
  { key: 'er', name: 'ER Diagram', code: EXAMPLES.er.code },
  { key: 'component', name: 'Component Diagram', code: EXAMPLES.component.code },
  { key: 'activity', name: 'Activity Diagram', code: EXAMPLES.activity.code },
  { key: 'mindmap', name: 'Mind Map', code: EXAMPLES.mindmap.code },
  { key: 'gantt', name: 'Gantt Diagram', code: EXAMPLES.gantt.code },
  { key: 'dot', name: 'DOT Diagram', code: EXAMPLES.dot.code },
  { key: 'class', name: 'Class Diagram', code: EXAMPLES.class.code },
] as const

const saveLocalScreenshots = String(Cypress.env('SAVE_SCREENSHOTS') || '') === 'true'
const log = console.log
log('saveLocalScreenshots', saveLocalScreenshots)

function takeSnapshot(name: string) {
  cy.percySnapshot(name)
  if (saveLocalScreenshots) {
    cy.screenshot(name, { capture: 'viewport' })
  }
}

describe('Theme Visual Tests', () => {
  // One test case per theme, rendering all diagram types
  THEMES.forEach(theme => {
    it(`renders all diagrams with ${theme} theme`, () => {
      // Use the first diagram to initialize the render
      const firstDiagram = DIAGRAM_TYPES[0]
      const c = startRender({
        code: firstDiagram.code,
        theme,
      })

      c.get('svg').should('exist')

      // Take snapshot of first diagram
      takeSnapshot(`${firstDiagram.name}-${theme}`)

      // Render and snapshot remaining diagrams
      DIAGRAM_TYPES.slice(1).forEach(diagram => {
        const next = startRender({ code: diagram.code, theme })
        next.get('svg').should('exist')
        takeSnapshot(`${diagram.name}-${theme}`)
      })
    })
  })
})
