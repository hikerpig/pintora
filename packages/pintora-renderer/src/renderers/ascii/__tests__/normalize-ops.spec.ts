import { AsciiLayer, DrawOp } from '../ops'
import { normalizeDrawOps } from '../normalize-ops'

describe('normalizeDrawOps', () => {
  it('snaps separator segments before rasterization', () => {
    const ops: DrawOp[] = [
      {
        kind: 'segment',
        p0: { x: 0, y: 27.1 },
        p1: { x: 64, y: 27.1 },
        layer: AsciiLayer.LINES,
        semantic: { role: 'separator' },
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const segment = normalized[0] as Extract<DrawOp, { kind: 'segment' }>

    expect(segment.p0.y).toBe(16)
    expect(segment.p1.y).toBe(16)
  })

  it('clamps text to semantic container inner bounds', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 16, y: 16 },
          { x: 80, y: 16 },
          { x: 80, y: 64 },
          { x: 16, y: 64 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
      {
        kind: 'text',
        point: { x: 16, y: 16 },
        text: 'A',
        textAlign: 'left',
        textBaseline: 'top',
        layer: AsciiLayer.MARKERS,
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const text = normalized.find(op => op.kind === 'text') as Extract<DrawOp, { kind: 'text' }>

    expect(text.point.x).toBe(24)
    expect(text.point.y).toBe(32)
    expect(text.textAlign).toBe('left')
    expect(text.textBaseline).toBe('top')
  })

  it('moves container text off semantic separator rows', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 16, y: 16 },
          { x: 240, y: 16 },
          { x: 240, y: 96 },
          { x: 16, y: 96 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
      {
        kind: 'segment',
        p0: { x: 16, y: 64.1 },
        p1: { x: 240, y: 64.1 },
        layer: AsciiLayer.LINES,
        semantic: { role: 'separator' },
      },
      {
        kind: 'text',
        point: { x: 24, y: 64 },
        text: 'Apple fromString(str)',
        textAlign: 'left',
        textBaseline: 'top',
        layer: AsciiLayer.MARKERS,
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const text = normalized.find(op => op.kind === 'text') as Extract<DrawOp, { kind: 'text' }>
    const separator = normalized.find(op => op.kind === 'segment' && op.semantic?.role === 'separator') as Extract<
      DrawOp,
      { kind: 'segment' }
    >

    expect(text.point.y).not.toBe(separator.p0.y)
    expect(text.point.y).toBe(80)
  })
})
