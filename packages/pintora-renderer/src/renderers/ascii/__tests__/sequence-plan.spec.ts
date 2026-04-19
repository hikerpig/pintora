import { buildSequenceTextPlan } from '../sequence/plan'
import { SequenceAsciiRenderData } from '../sequence/types'

const sequenceAsciiIR: SequenceAsciiRenderData = {
  meta: { direction: 'TB' },
  actors: [
    { id: 'User', label: 'User' },
    { id: 'Pintora', label: 'Pintora' },
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
    {
      kind: 'note',
      index: 1,
      anchorActorIds: ['Pintora'],
      placement: 'right',
      text: 'ascii lane',
    },
    {
      kind: 'divider',
      index: 2,
      text: 'Divider',
    },
  ],
  activations: [],
  spans: [],
}

describe('buildSequenceTextPlan', () => {
  it('allocates actor columns and separates label rows from arrow rows', () => {
    const plan = buildSequenceTextPlan(sequenceAsciiIR)

    expect(plan.columns.map(column => column.actorId)).toEqual(['User', 'Pintora'])
    expect(plan.messages[0].labelRows[0]).toBeLessThan(plan.messages[0].arrowRow)
  })

  it('allocates a right-side note lane and a dedicated divider row', () => {
    const plan = buildSequenceTextPlan(sequenceAsciiIR)

    expect(plan.notes[0].lane).toBe('right')
    expect(plan.rows.some(row => row.kind === 'divider')).toBe(true)
  })

  it('allocates block header rows, section rows, and body spans before rendering', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'message', index: 1, fromActorId: 'B', toActorId: 'A', label: 'return', style: 'solid', isSelf: false },
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
    })

    expect(plan.blocks[0]).toMatchObject({
      kind: 'alt',
      startEventIndex: 0,
      endEventIndex: 1,
    })
    expect(plan.rows.some(row => row.kind === 'block-section')).toBe(true)
  })

  it('allocates activation columns without moving actor lifeline columns', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 1 }],
      spans: [],
    })

    expect(plan.columns.find(column => column.actorId === 'B')?.lifelineCol).toBe(plan.columns[1].centerCol)
    expect(plan.activations[0]).toMatchObject({
      actorId: 'B',
      level: 1,
    })
    expect(plan.activations[0].barCols[0]).toBeGreaterThan(plan.columns[1].lifelineCol)
  })
})
