import * as pintora from '@pintora/core'
import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig } from '../../__tests__/test-util'
import { mindmap, type MindmapIR } from '../index'

describe('mindmap-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('mindmap', mindmap)
  })

  it('should generate graphicIR', () => {
    expect((testDraw(EXAMPLES.mindmap.code).graphicIR.mark as any).children.length).toBeGreaterThan(0)
  })

  describe('mindmap @pre block', () => {
    it('can parse param in @pre', () => {
      const example = stripStartEmptyLines(`
    @pre
    @title Hello Pre
    @endpre
    mindmap
      %% comment here
      `)
      const diagramIR = pintora.parseAndDraw(example, {}).diagramIR as MindmapIR
      expect(diagramIR.title).toBe('Hello Pre')
    })
  })
})
