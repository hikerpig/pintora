import { diagramRegistry } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { dotDiagram } from '../index'

describe('dot-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('dotDiagram', dotDiagram)
  })

  it('match example snapshot', () => {
    expect(stripDrawResultForSnapshot(testDraw(EXAMPLES.dot.code))).toMatchSnapshot()
  })

  it('renders different arrow type', () => {
    const code = `
    dotDiagram
    digraph Test {
      bgcolor="lightyellow";
      label="Graph Label";

      a1 -> b1 [arrowhead="box"];
      n1 -> end [arrowhead="odot"];
      a2 -> end [arrowhead="open"];
    }
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })
})
