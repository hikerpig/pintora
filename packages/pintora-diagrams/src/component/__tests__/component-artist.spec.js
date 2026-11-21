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
  describe('empty groups', () => {
    function findNonFiniteNumbers(value, path = 'graphicIR', found = []) {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) found.push(path)
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => findNonFiniteNumbers(item, `${path}[${i}]`, found))
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => findNonFiniteNumbers(item, `${path}.${key}`, found))
      }
      return found
    }

    function findMarks(mark, test, found = []) {
      if (test(mark)) found.push(mark)
      ;(mark.children || []).forEach(child => findMarks(child, test, found))
      return found
    }

    const groupTypes = ['package', 'node', 'folder', 'frame', 'cloud', 'database', 'rectangle', 'component']
    groupTypes.forEach(groupType => {
      it(`draws an empty ${groupType} with finite geometry`, () => {
        const code = `
      componentDiagram
      ${groupType} "Empty" {
      }
      [A] --> [B]
    `
        const result = testDraw(code)
        expect(findNonFiniteNumbers(result.graphicIR)).toEqual([])
      })
    })

    it('draws an empty group inside another group with finite geometry', () => {
      const code = `
      componentDiagram
      package "Outer" {
        package "Inner" {
        }
      }
    `
      const result = testDraw(code)
      expect(findNonFiniteNumbers(result.graphicIR)).toEqual([])
    })

    it('keeps the label and the type of an empty group inside its box', () => {
      const code = `
      componentDiagram
      rectangle "Empty" {
      }
    `
      const result = testDraw(code)
      const [rect] = findMarks(result.graphicIR.mark, m => m.class === 'component__group-rect')
      const [label] = findMarks(result.graphicIR.mark, m => m.class === 'component__group-label')
      const [type] = findMarks(result.graphicIR.mark, m => m.class === 'component__type')
      expect(rect.attrs.width).toBeGreaterThan(0)
      expect(rect.attrs.height).toBeGreaterThan(0)
      for (const text of [label, type]) {
        expect(text.attrs.y).toBeGreaterThan(rect.attrs.y)
        expect(text.attrs.y).toBeLessThan(rect.attrs.y + rect.attrs.height)
      }
    })
  })
})
