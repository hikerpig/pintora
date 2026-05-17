import * as pintora from '@pintora/core'
import { renderTextDiagramPlan } from '@pintora/renderer/renderers/ascii/text-plan-renderer'
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

  it('attaches a mindmap ASCII text plan with nodes and directional connectors', () => {
    const code = stripStartEmptyLines(`
    mindmap
    title: ASCII Mindmap
    + Root
    ++ Right Child
    -- Left Child
    --- Left Leaf
    `)
    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan

    expect(plan).toBeTruthy()
    expect(plan?.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'line' })]))
    expect(plan?.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'Root' })]))
    expect(plan?.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'Right Child' })]))
    expect(plan?.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'Left Child' })]))

    const text = renderTextDiagramPlan(plan!)
    expect(text).toContain('ASCII Mindmap')
    expect(text).toContain('Root')
    expect(text).toContain('Right Child')
    expect(text).toContain('Left Child')
    expect(text).toContain('Left Leaf')
    expect(text).toMatch(/[▶◀]/)
    expect(text).toMatch(/[─│]/)
  })

  it('aligns the root-facing edges of left-side sibling nodes', () => {
    const code = stripStartEmptyLines(`
    mindmap
    title: Mind Map Example
    + UML Diagrams
    ++ Behavior Diagrams
    +++ Sequence Diagram
    +++ State Diagram
    +++ Activity Diagram
    -- Structural Diagrams
    --- Class Diagram
    --- Component Diagram
    `)
    const result = testDraw(code)
    const text = renderTextDiagramPlan(result.graphicIR.rendererData!.ascii!.plan!)
    const lines = text.split('\n')
    const classLine = lines.find(line => line.includes('Class Diagram'))!
    const componentLine = lines.find(line => line.includes('Component Diagram'))!
    const classRightEdge = classLine.indexOf('│', classLine.indexOf('Class Diagram') + 'Class Diagram'.length)
    const componentRightEdge = componentLine.indexOf(
      '│',
      componentLine.indexOf('Component Diagram') + 'Component Diagram'.length,
    )

    expect(classRightEdge).toBe(componentRightEdge)
  })

  it('aligns single first-level side branches with the root node center', () => {
    const code = stripStartEmptyLines(`
    mindmap
    title: Mind Map Example
    + UML Diagrams
    ++ Behavior Diagrams
    +++ Sequence Diagram
    +++ State Diagram
    +++ Activity Diagram
    -- Structural Diagrams
    --- Class Diagram
    --- Component Diagram
    `)
    const result = testDraw(code)
    const textOps = result.graphicIR.rendererData!.ascii!.plan!.ops.filter(op => op.type === 'text')
    const rootText = textOps.find(op => op.text === 'UML Diagrams')!
    const leftText = textOps.find(op => op.text === 'Structural Diagrams')!

    expect(leftText.y).toBe(rootText.y)
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
