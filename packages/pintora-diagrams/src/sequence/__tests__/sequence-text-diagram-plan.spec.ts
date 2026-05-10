import { toSequenceTextDiagramPlan } from '../ascii/text-plan'
import type { SequenceAsciiRenderData } from '../ascii/types'

describe('toSequenceTextDiagramPlan', () => {
  it('lowers sequence actors messages notes dividers activations and blocks to generic text ops', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'B', label: 'enter', style: 'solid', isSelf: false },
        { kind: 'note', index: 1, anchorActorIds: ['B'], placement: 'right', text: 'ascii lane' },
        { kind: 'divider', index: 2, text: 'Divider' },
      ],
      activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 0 }],
      spans: [{ kind: 'opt', startEventIndex: 0, endEventIndex: 0, label: 'fast path' }],
    }

    const plan = toSequenceTextDiagramPlan(source)

    expect(plan.width).toBeGreaterThan(20)
    expect(plan.height).toBeGreaterThan(10)
    expect(plan.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: 'A' }),
        expect.objectContaining({ type: 'text', text: 'B' }),
        expect.objectContaining({ type: 'text', text: 'enter' }),
        expect.objectContaining({ type: 'text', text: 'ascii lane' }),
        expect.objectContaining({ type: 'text', text: 'Divider' }),
        expect.objectContaining({ type: 'text', text: 'opt fast path' }),
        expect.objectContaining({ type: 'fill', char: '|' }),
      ]),
    )
    expect(plan.ops.some(op => op.type === 'line' && op.endHead === 'filled')).toBe(true)
    expect(plan.ops.some(op => op.type === 'rect')).toBe(true)
  })

  it('lowers self messages into generic line and text ops', () => {
    const source: SequenceAsciiRenderData = {
      meta: { direction: 'TB' },
      actors: [{ id: 'A', label: 'A' }],
      events: [
        { kind: 'message', index: 0, fromActorId: 'A', toActorId: 'A', label: 'self', style: 'solid', isSelf: true },
      ],
      activations: [],
      spans: [],
    }

    const plan = toSequenceTextDiagramPlan(source)

    expect(plan.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'self' })]))
    expect(plan.ops.some(op => op.type === 'line' && op.endHead === 'filled')).toBe(true)
  })
})
