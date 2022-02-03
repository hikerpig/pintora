import pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig } from '../../__tests__/test-util'
import { activityDiagram } from '../index'

describe('activity-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('activityDiagram', activityDiagram)
  })

  it('can draw', () => {
    expect(testDraw(EXAMPLES.activity.code).graphicIR.mark).toBeTruthy()
  })
})
