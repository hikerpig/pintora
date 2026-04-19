import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

describe('buildSequenceLayoutResult', () => {
  it('extracts stable actor order and event order from sequence layout state', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant User
  participant Pintora
  User->>Pintora: render this
  note right of Pintora: ascii lane
  == Divider ==
      `,
      { containerSize: { width: 800 } },
    )!

    const graphicIR = result.graphicIR as any
    const layoutResult = graphicIR.rendererData?.ascii?.layout

    expect(layoutResult.actors.map((actor: any) => actor.id)).toEqual(['User', 'Pintora'])
    expect(layoutResult.events.map((event: any) => event.kind)).toEqual(['message', 'note', 'divider'])
  })
})
