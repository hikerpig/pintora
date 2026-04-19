import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'
import { buildSequenceLayoutResult } from '../layout-result'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

describe('buildSequenceLayoutResult', () => {
  it('captures activation ranges and block spans from the sequence layout snapshot', () => {
    const snapshot = {
      title: 'Phase 2',
      actors: [
        { id: 'A', label: 'A', order: 0 },
        { id: 'B', label: 'B', order: 1 },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'message', index: 1, fromActorId: 'B', toActorId: 'A', label: 'reply', style: 'solid', isSelf: false },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 1, level: 0 }],
      spans: [
        {
          kind: 'alt',
          startEventIndex: 0,
          endEventIndex: 1,
          label: 'cache miss',
          sections: [{ eventIndex: 1, label: 'else cache hit' }],
        },
      ],
    } as any

    const result = buildSequenceLayoutResult(snapshot)

    expect(result.activations).toEqual([
      { actorId: 'B', startEventIndex: 0, endEventIndex: 1, level: 0 },
    ])
    expect(result.spans[0]).toMatchObject({
      kind: 'alt',
      startEventIndex: 0,
      endEventIndex: 1,
      label: 'cache miss',
    })
    expect(result.spans[0].sections).toEqual([{ eventIndex: 1, label: 'else cache hit' }])
  })

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

  it('attaches parsed spans and activations to graphicIR.rendererData.ascii', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  A->>+B: enter
  alt cache miss
    B->>B: recompute
  else cache hit
    B-->>A: return
  end
  deactivate B
    `,
      { containerSize: { width: 900 } },
    )!

    const ascii = (result.graphicIR as any).rendererData.ascii

    expect(ascii.sequence.activations).toEqual([
      { actorId: 'B', startEventIndex: 0, endEventIndex: 2, level: 0 },
    ])
    expect(ascii.sequence.spans[0]).toMatchObject({
      kind: 'alt',
      label: 'cache miss',
    })
    expect(ascii.sequence.spans[0].sections).toEqual([{ eventIndex: 2, label: 'cache hit' }])
  })
})
