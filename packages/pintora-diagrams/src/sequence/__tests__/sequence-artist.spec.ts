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

  it('places sequence arrow head near message line end', () => {
    const code = `
    sequenceDiagram
      User->>Pintora: render this
    `
    const result = testDraw(code)

    const root = result.graphicIR.mark as pintora.Group
    const messageGroup = root.children.find(mark => mark.type === 'group' && mark.class === 'sequence__message')
    expect(messageGroup).toBeTruthy()
    if (!messageGroup || messageGroup.type !== 'group') return

    const lineMark = messageGroup.children.find(
      mark => mark.type === 'line' && mark.class === 'sequence__message__line',
    ) as any
    const arrowMark = messageGroup.children.find(
      mark => mark.type === 'path' && mark.class !== 'sequence__message__line',
    ) as any

    expect(lineMark).toBeTruthy()
    expect(arrowMark).toBeTruthy()
    expect(Array.isArray(arrowMark?.attrs?.path)).toBe(true)

    const lineEnd = { x: lineMark.attrs.x2, y: lineMark.attrs.y2 }

    const points = (arrowMark.attrs.path as any[])
      .map(command => {
        const type = command[0]
        if (type === 'M' || type === 'L' || type === 'm' || type === 'l') {
          return { x: command[1], y: command[2] }
        }
        if (type === 'C' || type === 'c') {
          return { x: command[5], y: command[6] }
        }
        if (type === 'A' || type === 'a') {
          return { x: command[6], y: command[7] }
        }
        return null
      })
      .filter(Boolean)
      .map((point: { x: number; y: number }) => {
        const m = arrowMark.matrix
        if (!m) return point
        return {
          x: m[0] * point.x + m[3] * point.y + m[6],
          y: m[1] * point.x + m[4] * point.y + m[7],
        }
      })

    const minDistance = Math.min(
      ...points.map(point => {
        const dx = point.x - lineEnd.x
        const dy = point.y - lineEnd.y
        return Math.sqrt(dx * dx + dy * dy)
      }),
    )

    expect(minDistance).toBeLessThan(2)
  })
})
