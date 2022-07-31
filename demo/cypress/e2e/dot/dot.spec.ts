import { stripStartEmptyLines } from '@pintora/test-shared'
import { makeSnapshotCases } from '../test-utils/render'

describe('DOT Diagram', () => {
  makeSnapshotCases([
    {
      description: 'Should render arrow shapes',
      code: stripStartEmptyLines(`
      dotDiagram
      digraph {
        bgcolor="#faf5f5";
        node [color="#111",bgcolor=orange]

        s1 -> e1 [arrowhead="box"]
        s2 -> e2 [arrowhead="obox"]
        s3 -> e3 [arrowhead="dot"]
        s4 -> e4 [arrowhead="odot"]
        s5 -> e5 [arrowhead="open"]
        s6 -> e6 [arrowhead="diamond"]
        s7 -> e7 [arrowhead="ediamond"]
      }
`),
    },
    {
      description: 'Should render node shapes',
      code: stripStartEmptyLines(`
      dotDiagram
      @param fontWeight bold
      digraph {
        bgcolor="#faf5f5";
        node [color="#111",bgcolor=orange]

        ellipse [shape="ellipse"];
        circle [shape="circle"];
        diamond [shape="diamond"];
        plaintext [shape="plaintext"];
      }
`),
    },
  ])
})
