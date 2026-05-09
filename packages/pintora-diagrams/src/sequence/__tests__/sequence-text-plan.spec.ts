import {
  allocateBaseEventRows,
  buildActorColumns,
  buildSequenceTextPlan,
  placeActivationOccupancy,
  placeDividerRows,
  placeSelfMessageTemplates,
  placeSpanBlockOccupancy,
} from '../ascii/plan'
import { SequenceAsciiRenderData } from '../ascii/types'
import type { SequenceTextBlockPlan, SequenceTextPlan } from '../ascii/types'

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

  it('exposes block occupants with header rows section rows and body spans', () => {
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
      activations: [],
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
    const block: SequenceTextBlockPlan = plan.blocks[0]

    expect(block).toMatchObject({
      kind: 'alt',
      label: 'cache miss',
      startEventIndex: 0,
      endEventIndex: 1,
      headerRow: 0,
      sections: [{ eventIndex: 1, label: 'else cache hit' }],
    })
    expect(plan.rows.some(row => row.kind === 'block-header' && row.startRow === block.headerRow)).toBe(true)
    expect(plan.rows.some(row => row.kind === 'block-section' && row.eventIndex === 1)).toBe(true)
    expect(block.frameCols[0]).toBeLessThan(plan.columns[0].headerLeftCol)
    expect(block.frameCols[1]).toBeGreaterThan(plan.columns[1].headerRightCol)
  })

  it('places activation bars with actor-local nesting offsets', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'message', index: 1, fromActorId: 'B', toActorId: 'B', label: 'nested', style: 'solid', isSelf: true },
      ],
      activations: [
        { actorId: 'B', startEventIndex: 0, endEventIndex: 1, level: 0 },
        { actorId: 'B', startEventIndex: 1, endEventIndex: 1, level: 1 },
      ],
      spans: [],
    }

    const columns = buildActorColumns(source)
    const rowStarts = new Map<number, number>([
      [0, 0],
      [1, 3],
    ])
    const rowEnds = new Map<number, number>([
      [0, 2],
      [1, 6],
    ])
    const activations = placeActivationOccupancy(source, columns, rowStarts, rowEnds)
    const bColumn = columns.find(column => column.actorId === 'B')!

    expect(activations[0]).toMatchObject({
      actorId: 'B',
      level: 0,
      barCols: [bColumn.lifelineCol + 1, bColumn.lifelineCol + 1],
      barRows: [1, 5],
    })
    expect(activations[1]).toMatchObject({
      actorId: 'B',
      level: 1,
      barCols: [bColumn.lifelineCol + 3, bColumn.lifelineCol + 3],
      barRows: [4, 5],
    })
  })

  it('keeps activation bars inside the message band boundaries', () => {
    const source: SequenceAsciiRenderData = {
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
          kind: 'message',
          index: 1,
          fromActorId: 'Pintora',
          toActorId: 'User',
          label: 'your figure here',
          style: 'dashed',
          isSelf: false,
        },
      ],
      activations: [{ actorId: 'Pintora', startEventIndex: 0, endEventIndex: 1, level: 0 }],
      spans: [],
    }

    const plan = buildSequenceTextPlan(source)

    expect(plan.activations[0].barRows).toEqual([plan.messages[0].arrowRow, plan.messages[1].arrowRow])
  })

  it('applies block occupancy before self messages dividers and activations', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'message', index: 1, fromActorId: 'B', toActorId: 'B', label: 'retry', style: 'solid', isSelf: true },
        { kind: 'divider', index: 2, text: 'Done' },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 1, level: 0 }],
      spans: [
        {
          kind: 'loop',
          startEventIndex: 0,
          endEventIndex: 2,
          label: 'attempts',
        },
      ],
    })

    const block = plan.blocks[0]
    const selfMessage = plan.selfMessages[0]
    const divider = plan.dividers[0]
    const activation = plan.activations[0]

    expect(block.headerRow).toBe(0)
    expect(selfMessage.loopRows[0]).toBeGreaterThan(block.headerRow)
    expect(divider.strokeRow).toBeGreaterThan(selfMessage.loopRows[1])
    expect(activation.barRows[0]).toBeGreaterThan(block.headerRow)
    expect(activation.barRows[1]).toBeGreaterThanOrEqual(selfMessage.loopRows[0])
    expect(activation.barRows[1]).toBeLessThanOrEqual(selfMessage.loopRows[1])
  })

  it('plans a single-actor loop around its actor lane and shifted self-message body', () => {
    const plan = buildSequenceTextPlan({
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
          kind: 'message',
          index: 1,
          fromActorId: 'Pintora',
          toActorId: 'Pintora',
          label: 'Has input changed?',
          style: 'dashed',
          isSelf: true,
        },
        {
          kind: 'message',
          index: 2,
          fromActorId: 'Pintora',
          toActorId: 'User',
          label: 'your figure here',
          style: 'dashed',
          isSelf: false,
        },
      ],
      activations: [{ actorId: 'Pintora', startEventIndex: 0, endEventIndex: 2, level: 0 }],
      spans: [{ kind: 'loop', startEventIndex: 1, endEventIndex: 1, label: 'Check input' }],
    })

    const userColumn = plan.columns.find(column => column.actorId === 'User')!
    const block = plan.blocks[0]
    const selfMessage = plan.selfMessages[0]
    const returnMessage = plan.messages.find(message => message.eventIndex === 2)!

    expect(block.frameCols[0]).toBeGreaterThan(userColumn.headerRightCol)
    expect(block.frameCols[1]).toBeGreaterThanOrEqual(selfMessage.loopCols[1] + 2)
    expect(block.bodyRows[1]).toBeGreaterThanOrEqual(selfMessage.loopRows[1])
    expect(returnMessage.labelRows[0]).toBeGreaterThan(block.bodyRows[1])
  })

  it('keeps activation occupancy from changing actor lifeline columns', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 2 }],
      spans: [],
    }

    const columns = buildActorColumns(source)
    const plan = buildSequenceTextPlan(source)

    expect(plan.columns).toEqual(columns)
    expect(plan.activations[0].barCols[0]).toBe(columns[1].lifelineCol + 5)
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

  it('places left notes in a lane left of the anchor actor', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [{ kind: 'note', index: 0, anchorActorIds: ['B'], placement: 'left', text: 'left note' }],
      activations: [],
      spans: [],
    })

    const note = plan.notes[0]
    expect(note.lane).toBe('left')
    const bCol = plan.columns.find(c => c.actorId === 'B')!
    expect(note.boxCols[1]).toBeLessThan(bCol.headerLeftCol)
  })

  it('places right notes in a lane right of the anchor actor', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [{ kind: 'note', index: 0, anchorActorIds: ['A'], placement: 'right', text: 'right note' }],
      activations: [],
      spans: [],
    })

    const note = plan.notes[0]
    expect(note.lane).toBe('right')
    const aCol = plan.columns.find(c => c.actorId === 'A')!
    expect(note.boxCols[0]).toBeGreaterThan(aCol.headerRightCol)
  })

  it('places over notes spanning across anchor actors', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [{ kind: 'note', index: 0, anchorActorIds: ['A', 'B'], placement: 'over', text: 'over note' }],
      activations: [],
      spans: [],
    })

    const note = plan.notes[0]
    expect(note.lane).toBe('over')
    const aCol = plan.columns.find(c => c.actorId === 'A')!
    const bCol = plan.columns.find(c => c.actorId === 'B')!
    expect(note.boxCols[0]).toBeLessThanOrEqual(aCol.centerCol)
    expect(note.boxCols[1]).toBeGreaterThanOrEqual(bCol.centerCol)
  })

  it('exposes phase 4 to 6 planned occupant collections', () => {
    const plan = buildSequenceTextPlan({
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'call', style: 'solid', isSelf: false },
      ],
      activations: [],
      spans: [],
    })

    expect(plan.selfMessages).toEqual([])
    expect(plan.dividers).toEqual([])
    expect(plan.activations).toEqual([])
  })

  it('does not mutate actor columns when left notes expand the viewport', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'note', index: 0, anchorActorIds: ['A'], placement: 'left', text: 'wide left note' },
        { kind: 'message', index: 1, fromActorId: 'A', toActorId: 'B', label: 'after', style: 'solid', isSelf: false },
      ],
      activations: [],
      spans: [],
    }

    const columnsBeforeNotes = buildActorColumns(source)
    const plan = buildSequenceTextPlan(source)

    expect(plan.columns).toEqual(columnsBeforeNotes)
    expect(plan.viewport.minCol).toBeLessThan(0)
    expect(plan.viewport.renderOffsetCol).toBeGreaterThan(0)
  })
})

describe('allocateBaseEventRows', () => {
  it('allocates base event rows in source event order', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 10, fromActorId: 'A', toActorId: 'B', label: 'first', style: 'solid', isSelf: false },
        { kind: 'note', index: 20, anchorActorIds: ['B'], placement: 'right', text: 'side note' },
        { kind: 'divider', index: 30, text: 'Break' },
      ],
      activations: [],
      spans: [],
    }

    const base = allocateBaseEventRows(source)

    expect(base.messages[0]).toMatchObject({
      eventIndex: 10,
      labelRows: [0],
      arrowRow: 1,
    })
    expect(base.rows.map(row => row.eventIndex).filter(index => index !== undefined)).toEqual([10, 10, 20, 30])
    expect(base.eventIndexToFirstRow.get(20)).toBeGreaterThan(base.eventIndexToLastRow.get(10)!)
    expect(base.eventIndexToFirstRow.get(30)).toBeGreaterThan(base.eventIndexToLastRow.get(20)!)
  })

  it('places self-message loop templates from actor columns and message rows', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [{ id: 'A', label: 'A' }],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'A',
          toActorId: 'A',
          label: 'retry later',
          style: 'solid',
          isSelf: true,
        },
      ],
      activations: [],
      spans: [],
    }

    const columns = buildActorColumns(source)
    const base = allocateBaseEventRows(source)
    const selfMessages = placeSelfMessageTemplates(columns, base.messages)

    expect(selfMessages[0]).toMatchObject({
      eventIndex: 0,
      actorId: 'A',
      label: 'retry later',
      labelRows: [0],
    })
    expect(selfMessages[0].loopCols[0]).toBe(columns[0].lifelineCol)
    expect(selfMessages[0].loopCols[1]).toBeGreaterThan(columns[0].lifelineCol)
    expect(selfMessages[0].loopRows).toEqual([1, 3])
    expect(selfMessages[0].arrowHeadRow).toBe(3)
  })

  it('plans divider rule columns label columns and text exclusion zone', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [{ kind: 'divider', index: 7, text: 'Pause' }],
      activations: [],
      spans: [],
    }

    const columns = buildActorColumns(source)
    const base = allocateBaseEventRows(source)
    const dividers = placeDividerRows(source, columns, base.rows)

    expect(dividers[0]).toMatchObject({
      eventIndex: 7,
      text: 'Pause',
      strokeRow: 0,
    })
    expect(dividers[0].ruleCols[0]).toBeLessThan(columns[0].headerLeftCol)
    expect(dividers[0].ruleCols[1]).toBeGreaterThan(columns[1].headerRightCol)
    expect(dividers[0].textExclusionCols[0]).toBeLessThanOrEqual(dividers[0].labelCols[0])
    expect(dividers[0].textExclusionCols[1]).toBeGreaterThanOrEqual(dividers[0].labelCols[1])
  })

  it('allocates self-message base rows without deriving geometry in phase 2', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [{ id: 'A', label: 'A' }],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'A', label: 'retry', style: 'solid', isSelf: true },
      ],
      activations: [],
      spans: [],
    }

    const base = allocateBaseEventRows(source)

    expect(base.rows.map(row => row.kind)).toEqual(['self-message', 'self-message'])
    expect(base.messages[0].isSelf).toBe(true)
    expect(base.messages[0].labelRows).toEqual([0])
    expect(base.messages[0].arrowRow).toBe(1)
  })

  it('places span block occupancy and shifts later event rows', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'message', index: 1, fromActorId: 'B', toActorId: 'A', label: 'return', style: 'solid', isSelf: false },
      ],
      activations: [],
      spans: [
        {
          kind: 'alt',
          startEventIndex: 0,
          endEventIndex: 1,
          label: 'cache miss',
          sections: [{ eventIndex: 1, label: 'else cache hit' }],
        },
      ],
    }

    const columns = buildActorColumns(source)
    const base = allocateBaseEventRows(source)
    const notes: SequenceTextPlan['notes'] = []
    const occupancy = placeSpanBlockOccupancy(source, columns, base, base.messages, notes)

    expect(occupancy.blocks[0]).toMatchObject({
      kind: 'alt',
      label: 'cache miss',
      headerRow: 0,
    })
    expect(occupancy.messages[0].labelRows[0]).toBe(1)
    expect(occupancy.messages[1].labelRows[0]).toBeGreaterThan(base.messages[1].labelRows[0])
    expect(occupancy.eventIndexToFirstRow.get(0)).toBe(1)
    expect(occupancy.eventIndexToFirstRow.get(1)).toBeGreaterThan(base.eventIndexToFirstRow.get(1)!)
  })

  it('places note rows relative to their owning event band', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'before', style: 'solid', isSelf: false },
        { kind: 'note', index: 1, anchorActorIds: ['B'], placement: 'right', text: 'owned note' },
        { kind: 'message', index: 2, fromActorId: 'B', toActorId: 'A', label: 'after', style: 'solid', isSelf: false },
      ],
      activations: [],
      spans: [],
    }

    const plan = buildSequenceTextPlan(source)
    const noteRow = plan.rows.find(row => row.kind === 'note' && row.eventIndex === 1)!
    const note = plan.notes.find(item => item.eventIndex === 1)!

    expect(note.boxRows).toEqual([noteRow.startRow, noteRow.endRow])
    expect(note.boxRows[0]).toBeGreaterThan(plan.messages[0].arrowRow)
    expect(note.boxRows[1]).toBeLessThan(plan.messages[1].labelRows[0])
  })
})
