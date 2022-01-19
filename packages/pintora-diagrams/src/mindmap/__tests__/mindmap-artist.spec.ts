import pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig } from '../../__tests__/test-util'
import { mindmap } from '../index'

describe('mindmap-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('mindmap', mindmap)
  })

  it('should generate graphicIR', () => {
    expect((testDraw(EXAMPLES.mindmap.code).graphicIR.mark as any).children.length).toBeGreaterThan(0)
  })
})
