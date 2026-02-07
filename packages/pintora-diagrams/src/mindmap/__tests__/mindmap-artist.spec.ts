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

  it('uses group matrix for node positioning after layout in g v6', () => {
    const code = `
mindmap
* UML Diagram
** Sequence Diagram
** State Diagram
** Component Diagram
* Non-UML Diagram
** Entity Relationship Diagram
** Mind Map
`
    const { graphicIR } = testDraw(code)
    const labels = new Set([
      'UML Diagram',
      'Sequence Diagram',
      'State Diagram',
      'Component Diagram',
      'Non-UML Diagram',
      'Entity Relationship Diagram',
      'Mind Map',
    ])

    const nodeGroups = (graphicIR.mark as pintora.Group).children.filter(
      mark => mark.type === 'group' && mark.class === 'mindmap__node',
    )
    expect(nodeGroups).toHaveLength(labels.size)
    nodeGroups.forEach((group: pintora.Group) => {
      expect(group.matrix).toBeTruthy()
      const textMark = group.children.find(mark => mark.type === 'text' && labels.has(mark.attrs.text))
      expect(textMark).toBeTruthy()
      if (textMark?.type === 'text') {
        expect(textMark.attrs.x ?? 0).toBe(0)
        expect(textMark.attrs.y ?? 0).toBe(0)
      }
    })
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
