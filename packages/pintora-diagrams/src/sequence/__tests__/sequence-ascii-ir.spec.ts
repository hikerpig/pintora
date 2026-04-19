import { toSequenceAsciiIR } from '../ascii-ir'

describe('toSequenceAsciiIR', () => {
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
