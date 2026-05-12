import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'
import { buildSequenceLayoutResult } from '../layout-result'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

describe('buildSequenceLayoutResult', () => {
  it('exposes renderer-independent geometry in the sequence ascii layout snapshot', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant User
  participant Pintora
  User->>+Pintora: render
  note right of Pintora: ascii lane
  loop retry
    Pintora-->>Pintora: recompute
  end
  deactivate Pintora
    `,
      { containerSize: { width: 900 } },
    )!

    const layout = (result.graphicIR as any).rendererData.ascii.layout

    expect(layout.contentBounds).toMatchObject({
      startX: expect.any(Number),
      stopX: expect.any(Number),
      startY: expect.any(Number),
      stopY: expect.any(Number),
    })
    expect(layout.actors[0]).toMatchObject({
      id: 'User',
      centerX: expect.any(Number),
      leftX: expect.any(Number),
      rightX: expect.any(Number),
      headerBounds: {
        startX: expect.any(Number),
        stopX: expect.any(Number),
        startY: expect.any(Number),
        stopY: expect.any(Number),
      },
    })
    expect(layout.events[0]).toMatchObject({
      kind: 'message',
      bounds: {
        startX: expect.any(Number),
        stopX: expect.any(Number),
        startY: expect.any(Number),
        stopY: expect.any(Number),
      },
    })
    expect(layout.activations[0]).toMatchObject({
      actorId: 'Pintora',
      bounds: {
        startX: expect.any(Number),
        stopX: expect.any(Number),
        startY: expect.any(Number),
        stopY: expect.any(Number),
      },
    })
    expect(layout.spans[0]).toMatchObject({
      kind: 'loop',
      bounds: {
        startX: expect.any(Number),
        stopX: expect.any(Number),
        startY: expect.any(Number),
        stopY: expect.any(Number),
      },
    })
  })

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

    expect(result.activations).toEqual([{ actorId: 'B', startEventIndex: 0, endEventIndex: 1, level: 0 }])
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

  it('stores complete sequence snapshot and legacy ascii projection separately', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant A
  participant B
  A->>B: enter
    `,
      { containerSize: { width: 900 } },
    )!

    const ascii = (result.graphicIR as any).rendererData.ascii

    expect(ascii.layout.events[0].bounds).toMatchObject({
      startX: expect.any(Number),
      stopX: expect.any(Number),
      startY: expect.any(Number),
      stopY: expect.any(Number),
    })
    expect(ascii.legacyLayout.events[0]).toEqual(
      expect.objectContaining({
        kind: 'message',
        fromActorId: 'A',
        toActorId: 'B',
        label: 'enter',
      }),
    )
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

    expect(ascii.sequence).toBeUndefined()
    expect(ascii.layout.contentBounds).toBeTruthy()
    expect(ascii.legacyLayout).toBeTruthy()
    expect(ascii.legacyLayout.activations).toEqual([{ actorId: 'B', startEventIndex: 0, endEventIndex: 2, level: 0 }])
    expect(ascii.legacyLayout.spans[0]).toMatchObject({
      kind: 'alt',
      label: 'cache miss',
    })
    expect(ascii.legacyLayout.spans[0].sections).toEqual([{ eventIndex: 2, label: 'cache hit' }])
  })

  it('keeps a loop span ending before a following divider', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here

  == Divider ==
    `,
      { containerSize: { width: 900 } },
    )!

    const ascii = (result.graphicIR as any).rendererData.ascii

    expect(ascii.sequence).toBeUndefined()
    expect(ascii.legacyLayout.events.map((event: any) => event.kind)).toEqual(['message', 'message', 'divider'])
    expect(ascii.legacyLayout.spans[0]).toMatchObject({
      kind: 'loop',
      label: 'Check input',
      startEventIndex: 0,
      endEventIndex: 0,
    })
  })

  it('attaches a generic text diagram plan to graphicIR.rendererData.ascii', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant A
  participant B
  A->>B: enter
    `,
      { containerSize: { width: 900 } },
    )!

    const ascii = (result.graphicIR as any).rendererData.ascii
    expect(ascii.sequence).toBeUndefined()
    expect(ascii.plan).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      ops: expect.any(Array),
    })
    expect(ascii.plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'enter' })]))
  })

  it('builds the generic ascii text plan from the full sequence snapshot', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant A
  participant B
  A->>B: enter
  note right of B: ascii lane
    `,
      { containerSize: { width: 900 } },
    )!

    const ascii = (result.graphicIR as any).rendererData.ascii

    expect(ascii.layout.events[0].bounds).toBeTruthy()
    expect(ascii.plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'enter' })]))
    expect(ascii.plan.ops).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'ascii lane' })]),
    )
  })
})
