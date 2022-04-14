import { stripStartEmptyLines } from '@pintora/test-shared'
import { makeSnapshotCases } from '../test-utils/render'

describe('Component Diagram', () => {
  makeSnapshotCases([
    {
      description: 'Should render ortho edges and labels not fully overlapping with borders',
      code: stripStartEmptyLines(`
componentDiagram
  @param edgeType ortho
  package "@pintora/core" {
    () GraphicsIR
    () IRenderer
    () IDiagram
    [Diagram Registry] as registry
  }

  package "@pintora/renderer" {
    () "render()" as renderFn
    [SVGRender]
    [SVGRender] --> IRenderer : implements
    IRenderer ..> GraphicsIR : accepts
  }
  package "@pintora/standalone" {
    [standalone]
  }
  [IDiagram] --> GraphicsIR : generate
  [standalone] --> registry : register all of @pintora/diagrams

  [standalone] --> renderFn : call with GraphicsIR
`),
      onRender(c) {
        c.get('.component__type').should('exist')
      },
    },
  ])
})
