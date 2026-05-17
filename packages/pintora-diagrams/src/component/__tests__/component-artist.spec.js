import { diagramRegistry } from '@pintora/core'
import { renderTextDiagramPlan } from '@pintora/renderer/renderers/ascii/text-plan-renderer'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { componentDiagram } from '../index'

function stripSvgResultForSnapshot(result) {
  const ir = stripDrawResultForSnapshot(result)
  delete ir.rendererData
  return ir
}

describe('component-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('componentDiagram', componentDiagram)
  })

  it('match example snapshot', () => {
    expect(stripSvgResultForSnapshot(testDraw(EXAMPLES.component.code))).toMatchSnapshot()
  })

  it('can parse and handle bindClass', () => {
    const code = `
    componentDiagram
    component comp1
    
    @bindClass node-comp1 test-class
    `
    expect(stripSvgResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('should not freeze when connecting child component to parent package', () => {
    // issue #387
    const code = `
      componentDiagram
      package "Foo" {
        [Bar]
      }
      [Bar] --> [Foo]
    `
    const result = testDraw(code)
    expect(result).toBeTruthy()
    // Verify that the skipped edge is actually drawn with a non-empty path
    const lineMarks = result.graphicIR.mark.children
      .filter(child => child.type === 'group')
      .flatMap(group => group.children || [])
      .filter(child => child.class === 'component__rel-line')
    expect(lineMarks.length).toBeGreaterThan(0)
    expect(lineMarks[0].attrs.path).toBeTruthy()
    expect(lineMarks[0].attrs.path.length).toBeGreaterThan(0)
  })

  it('should not freeze when connecting parent package to child component', () => {
    const code = `
      componentDiagram
      package "Foo" {
        [Bar]
      }
      [Foo] --> [Bar]
    `
    const result = testDraw(code)
    expect(result).toBeTruthy()
    // Verify that the skipped edge is actually drawn with a non-empty path
    const lineMarks = result.graphicIR.mark.children
      .filter(child => child.type === 'group')
      .flatMap(group => group.children || [])
      .filter(child => child.class === 'component__rel-line')
    expect(lineMarks.length).toBeGreaterThan(0)
    expect(lineMarks[0].attrs.path).toBeTruthy()
    expect(lineMarks[0].attrs.path.length).toBeGreaterThan(0)
  })

  it('attaches a component ASCII text plan with groups, nodes, and relationships', () => {
    const code = `
      componentDiagram
      title: ASCII Component
      package "Core" {
        () GraphicsIR
        [Diagram Registry] as registry
      }
      [registry] --> GraphicsIR : returns
    `

    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan

    expect(plan).toBeTruthy()
    expect(plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'line' })]))
    expect(plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'Core' })]))
    expect(plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'returns' })]))

    const text = renderTextDiagramPlan(plan)
    expect(text).toContain('ASCII Component')
    expect(text).toContain('Core')
    expect(text).toContain('GraphicsIR')
    expect(text).toContain('Diagram Registry')
    expect(text).toContain('returns')
    expect(text).toMatch(/[│─]/)
    expect(text).toMatch(/[▶▼]/)
  })
})
