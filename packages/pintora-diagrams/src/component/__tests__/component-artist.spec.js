import { diagramRegistry } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { componentDiagram } from '../index'

describe('component-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('componentDiagram', componentDiagram)
  })

  it('match example snapshot', () => {
    expect(stripDrawResultForSnapshot(testDraw(EXAMPLES.component.code))).toMatchSnapshot()
  })

  it('can parse and handle bindClass', () => {
    const code = `
    componentDiagram
    component comp1
    
    @bindClass node-comp1 test-class
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
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

  it.each([
    [
      'solid arrow',
      `
      componentDiagram
      [A] --> [B] : use
      `,
      {
        shaftStyle: 'solid',
        startTerminator: { kind: 'none' },
        endTerminator: { kind: 'arrow-filled' },
      },
    ],
    [
      'dotted reversed arrow',
      `
      componentDiagram
      [A] <.. [B] : use
      `,
      {
        shaftStyle: 'dashed',
        startTerminator: { kind: 'arrow-filled' },
        endTerminator: { kind: 'none' },
      },
    ],
  ])('marks component relationship shaft with connector semantics for %s', (_name, code, expected) => {
    const result = testDraw(code)
    const relGroup = result.graphicIR.mark.children.find(
      child => child.type === 'group' && child.children?.some(grandChild => grandChild.class === 'component__rel-line'),
    )
    expect(relGroup).toBeTruthy()
    if (!relGroup || relGroup.type !== 'group') return

    const lineMark = relGroup.children.find(child => child.class === 'component__rel-line')
    expect(lineMark?.semantic).toMatchObject({
      role: 'connector',
      strokePolicy: 'always',
      connector: {
        family: 'component-relationship',
        compact: true,
        shaftStyle: expected.shaftStyle,
        startTerminator: expected.startTerminator,
        endTerminator: expected.endTerminator,
      },
    })
  })
})
