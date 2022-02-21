import pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { sequenceDiagram } from '../index'

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
})
