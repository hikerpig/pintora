import * as pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { sequenceDiagram } from '../index'
import '../../util/symbols'

describe('sequence-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('sequenceDiagram', sequenceDiagram)
  })

  it('match example snapshot', () => {
    expect(stripDrawResultForSnapshot(testDraw(EXAMPLES.sequence.code))).toMatchSnapshot()
  })

  it('draw cross mark to', () => {
    const code = `
    sequenceDiagram
      A--xB : Message
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('will process containerSize and @useMaxWidth', () => {
    const code = `
    sequenceDiagram
      @config({
        "sequence": {
          "useMaxWidth": true
        }
      })
      A--xB : Message
    `
    const result = testDraw(code, { containerSize: { width: 300 } })
    expect(Math.round(result.graphicIR.width)).toBe(300)
  })

  it('will render boxes', () => {
    const code = `
    sequenceDiagram
    box #d6d3fa "group participants"
    participant A as "Alice"
    participant B
    endbox
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('draw participant classifier', () => {
    const code = `
    sequenceDiagram
      participant [<actor> A]
      participant [<database> B]
      participant [<diamond> C]
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  describe('empty group blocks', () => {
    function findNonFiniteNumbers(value: unknown, path = 'graphicIR', found: string[] = []) {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) found.push(path)
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => findNonFiniteNumbers(item, `${path}[${i}]`, found))
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => findNonFiniteNumbers(item, `${path}.${key}`, found))
      }
      return found
    }

    const cases = {
      loop: 'loop L\n      end',
      opt: 'opt O\n      end',
      alt: 'alt A\n      else B\n      end',
      par: 'par P\n      and Q\n      end',
      'nested in a block with messages': 'loop outer\n        B->>A: back\n        opt inner\n        end\n      end',
    }

    Object.entries(cases).forEach(([name, block]) => {
      it(`draws an empty ${name} block with finite geometry`, () => {
        const code = `
    sequenceDiagram
      A->>B: hi
      ${block}
      A->>B: bye
    `
        const result = testDraw(code)
        expect(findNonFiniteNumbers(result.graphicIR)).toEqual([])
        expect(result.graphicIR.height).toBeGreaterThan(0)
      })
    })

    it('keeps an empty block inside its parent block', () => {
      const code = `
    sequenceDiagram
      A->>B: hi
      loop outer
        B->>A: back
        opt inner
        end
      end
    `
      const result = testDraw(code)
      const rects = []
      const walk = mark => {
        if (mark.type === 'rect' && mark.attrs.lineDash) rects.push(mark.attrs)
        ;(mark.children || []).forEach(walk)
      }
      walk(result.graphicIR.mark)
      expect(rects.length).toBe(2)
      const [outer, inner] = rects[0].height > rects[1].height ? rects : [rects[1], rects[0]]
      expect(inner.x).toBeGreaterThanOrEqual(outer.x)
      expect(inner.y).toBeGreaterThanOrEqual(outer.y)
      expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width)
      expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height)
    })
  })
})
