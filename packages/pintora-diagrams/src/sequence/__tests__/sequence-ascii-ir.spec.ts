import { toSequenceAsciiIR } from '../ascii-ir'

describe('toSequenceAsciiIR', () => {
  it('projects spans and activations into the ASCII-facing contract', () => {
    const asciiIR = toSequenceAsciiIR({
      title: 'Phase 2',
      actors: [
        { id: 'A', label: 'A', order: 0 },
        { id: 'B', label: 'B', order: 1 },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 0 }],
      spans: [{ kind: 'loop', startEventIndex: 0, endEventIndex: 0, label: 'retry' }],
    } as any)

    expect(asciiIR.activations).toEqual([{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 0 }])
    expect(asciiIR.spans).toEqual([{ kind: 'loop', startEventIndex: 0, endEventIndex: 0, label: 'retry' }])
  })

  it('projects layout result into the ASCII-facing contract', () => {
    const asciiIR = toSequenceAsciiIR({
      title: undefined,
      actors: [
        { id: 'User', label: 'User', order: 0 },
        { id: 'Pintora', label: 'Pintora', order: 1 },
      ],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'User',
          toActorId: 'Pintora',
          label: 'render this',
          style: 'solid',
          isSelf: false,
        },
      ],
      activations: [],
      spans: [],
    } as any)

    expect(asciiIR.actors).toHaveLength(2)
    expect(asciiIR.events[0]).toMatchObject({
      kind: 'message',
      fromActorId: 'User',
      toActorId: 'Pintora',
      label: 'render this',
    })
  })
})
