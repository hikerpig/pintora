import { diagramRegistry } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { dotDiagram } from '../index'
import '../../util/symbols'

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

  it('renders different node type', () => {
    const code = `
    dotDiagram
    @param fontWeight bold
    digraph {
      ellipse [shape="ellipse"];
      circle [shape="circle"];
      diamond [shape="diamond"];
      plaintext [shape="plaintext"];
    }
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })
})
