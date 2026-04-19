import { buildSequenceTextPlan } from '../sequence/plan'

const sequenceAsciiIR = {
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
  spans: [],
} as const

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
})
