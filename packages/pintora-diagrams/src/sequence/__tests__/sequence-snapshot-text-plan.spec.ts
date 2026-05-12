import { makeSequenceAsciiProjection } from '../ascii/metrics'
import { renderTextDiagramPlan } from '@pintora/renderer/renderers/ascii/text-plan-renderer'
import { toSequenceSnapshotTextDiagramPlan } from '../ascii/text-plan'
import type { SequenceLayoutSnapshot } from '../layout-snapshot'

describe('sequence ascii snapshot projection metrics', () => {
  it('projects actor x positions into stable ordered text columns', () => {
    const projection = makeSequenceAsciiProjection({
      contentBounds: { startX: 0, stopX: 300, startY: 0, stopY: 200 },
      minActorGap: 12,
    })

    expect(projection.colForX(50)).toBeLessThan(projection.colForX(200))
    expect(projection.rowForY(20)).toBeLessThan(projection.rowForY(120))
  })

  it('projects bounds into inclusive cell ranges', () => {
    const projection = makeSequenceAsciiProjection({
      contentBounds: { startX: 10, stopX: 210, startY: 20, stopY: 220 },
      minActorGap: 12,
    })

    expect(projection.colsForBounds({ startX: 10, stopX: 50, startY: 20, stopY: 60 })).toEqual([0, 8])
    expect(projection.rowsForBounds({ startX: 10, stopX: 50, startY: 20, stopY: 60 })).toEqual([0, 2])
  })
})

describe('toSequenceSnapshotTextDiagramPlan', () => {
  it('renders actors and messages from sequence layout snapshot geometry', () => {
    const snapshot: SequenceLayoutSnapshot = {
      title: undefined,
      contentBounds: { startX: 0, stopX: 220, startY: 0, stopY: 140 },
      actors: [
        {
          id: 'A',
          label: 'A',
          order: 0,
          centerX: 30,
          leftX: 0,
          rightX: 60,
          headerBounds: { startX: 0, stopX: 60, startY: 0, stopY: 40 },
        },
        {
          id: 'B',
          label: 'B',
          order: 1,
          centerX: 180,
          leftX: 150,
          rightX: 210,
          headerBounds: { startX: 150, stopX: 210, startY: 0, stopY: 40 },
        },
      ],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'A',
          toActorId: 'B',
          label: 'enter',
          style: 'solid',
          isSelf: false,
          bounds: { startX: 30, stopX: 180, startY: 70, stopY: 90 },
        },
      ],
      activations: [],
      spans: [],
    }

    const text = renderTextDiagramPlan(toSequenceSnapshotTextDiagramPlan(snapshot))

    expect(text).toContain('A')
    expect(text).toContain('B')
    expect(text).toContain('enter')
    expect(text).toContain('▶')
  })

  it('renders self messages notes and dividers from snapshot geometry', () => {
    const snapshot: SequenceLayoutSnapshot = {
      title: undefined,
      contentBounds: { startX: 0, stopX: 260, startY: 0, stopY: 220 },
      actors: [
        {
          id: 'A',
          label: 'A',
          order: 0,
          centerX: 40,
          leftX: 0,
          rightX: 80,
          headerBounds: { startX: 0, stopX: 80, startY: 0, stopY: 40 },
        },
        {
          id: 'B',
          label: 'B',
          order: 1,
          centerX: 200,
          leftX: 160,
          rightX: 240,
          headerBounds: { startX: 160, stopX: 240, startY: 0, stopY: 40 },
        },
      ],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'A',
          toActorId: 'A',
          label: 'self',
          style: 'solid',
          isSelf: true,
          bounds: { startX: 40, stopX: 100, startY: 60, stopY: 90 },
        },
        {
          kind: 'note',
          index: 1,
          anchorActorIds: ['B'],
          placement: 'right',
          text: 'ascii lane',
          bounds: { startX: 210, stopX: 260, startY: 110, stopY: 150 },
        },
        {
          kind: 'divider',
          index: 2,
          text: 'Divider',
          bounds: { startX: 0, stopX: 260, startY: 180, stopY: 200 },
        },
      ],
      activations: [],
      spans: [],
    }

    const text = renderTextDiagramPlan(toSequenceSnapshotTextDiagramPlan(snapshot))

    expect(text).toContain('self')
    expect(text).toContain('ascii lane')
    expect(text).toContain('Divider')
  })

  it('renders activations and span frames from snapshot geometry', () => {
    const snapshot: SequenceLayoutSnapshot = {
      title: undefined,
      contentBounds: { startX: 0, stopX: 260, startY: 0, stopY: 220 },
      actors: [
        {
          id: 'A',
          label: 'A',
          order: 0,
          centerX: 40,
          leftX: 0,
          rightX: 80,
          headerBounds: { startX: 0, stopX: 80, startY: 0, stopY: 40 },
        },
        {
          id: 'B',
          label: 'B',
          order: 1,
          centerX: 200,
          leftX: 160,
          rightX: 240,
          headerBounds: { startX: 160, stopX: 240, startY: 0, stopY: 40 },
        },
      ],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'A',
          toActorId: 'B',
          label: 'enter',
          style: 'solid',
          isSelf: false,
          bounds: { startX: 40, stopX: 200, startY: 70, stopY: 90 },
        },
      ],
      activations: [
        {
          actorId: 'B',
          startEventIndex: 0,
          endEventIndex: 0,
          level: 0,
          bounds: { startX: 196, stopX: 204, startY: 68, stopY: 110 },
        },
      ],
      spans: [
        {
          kind: 'opt',
          startEventIndex: 0,
          endEventIndex: 0,
          label: 'fast path',
          bounds: { startX: 20, stopX: 230, startY: 50, stopY: 130 },
          sections: [],
        },
      ],
    }

    const text = renderTextDiagramPlan(toSequenceSnapshotTextDiagramPlan(snapshot))

    expect(text).toContain('opt fast path')
    expect(text).toContain('|')
    expect(text).toContain('enter')
  })
})
