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
        layer: AsciiLayer.TEXT,
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const text = normalized.find(op => op.kind === 'text') as Extract<DrawOp, { kind: 'text' }>

    expect(text.point.x).toBe(24)
    expect(text.point.y).toBe(32)
    expect(text.textAlign).toBe('left')
    expect(text.textBaseline).toBe('top')
  })

  it('snaps semantic container rects outward to stable grid bounds', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 101, y: 49.25 },
          { x: 201, y: 49.25 },
          { x: 201, y: 81.75 },
          { x: 101, y: 81.75 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const rect = normalized[0] as Extract<DrawOp, { kind: 'rect' }>

    expect(rect.points).toEqual([
      { x: 96, y: 48 },
      { x: 208, y: 48 },
      { x: 208, y: 96 },
      { x: 96, y: 96 },
    ])
  })

  it('snaps shared semantic container borders to one grid line', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 15, y: 49.25 },
          { x: 43.5, y: 49.25 },
          { x: 43.5, y: 81.75 },
          { x: 15, y: 81.75 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
      {
        kind: 'rect',
        points: [
          { x: 43.5, y: 49.25 },
          { x: 101, y: 49.25 },
          { x: 101, y: 81.75 },
          { x: 43.5, y: 81.75 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const left = normalized[0] as Extract<DrawOp, { kind: 'rect' }>
    const right = normalized[1] as Extract<DrawOp, { kind: 'rect' }>

    expect(left.points[1].x).toBe(40)
    expect(left.points[2].x).toBe(40)
    expect(right.points[0].x).toBe(40)
    expect(right.points[3].x).toBe(40)
  })

  it('keeps nested semantic containers off their parent border rows and cols after snapping', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 45, y: 80 },
          { x: 433.41, y: 80 },
          { x: 433.41, y: 203.48 },
          { x: 45, y: 203.48 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
      {
        kind: 'rect',
        points: [
          { x: 229.8, y: 95 },
          { x: 342.2, y: 95 },
          { x: 342.2, y: 128.29 },
          { x: 229.8, y: 128.29 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const parent = normalized[0] as Extract<DrawOp, { kind: 'rect' }>
    const child = normalized[1] as Extract<DrawOp, { kind: 'rect' }>

    expect(parent.points[0].y).toBe(80)
    expect(child.points[0].y).toBe(96)
    expect(child.points[0].y).toBeGreaterThan(parent.points[0].y)
  })

  it('preserves a blank cell gap between nearby visible rect borders after snapping', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 61.2, y: 158.29 },
          { x: 173.6, y: 158.29 },
          { x: 173.6, y: 188.48 },
          { x: 61.2, y: 188.48 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'backdrop',
          occludesBelow: true,
          strokePolicy: 'always',
        },
      },
      {
        kind: 'rect',
        points: [
          { x: 183.6, y: 158.29 },
          { x: 388.41, y: 158.29 },
          { x: 388.41, y: 188.48 },
          { x: 183.6, y: 188.48 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const left = normalized[0] as Extract<DrawOp, { kind: 'rect' }>
    const right = normalized[1] as Extract<DrawOp, { kind: 'rect' }>
    const leftRightCol = Math.round(left.points[1].x / 8)
    const rightLeftCol = Math.round(right.points[0].x / 8)

    expect(rightLeftCol - leftRightCol).toBeGreaterThanOrEqual(2)
  })

  it('prefers the smallest visible text region so note text stays inside its backdrop', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 40, y: 80 },
          { x: 440, y: 80 },
          { x: 440, y: 208 },
          { x: 40, y: 208 },
        ],
        layer: AsciiLayer.LINES,
        semantic: { role: 'container', strokePolicy: 'always' },
      },
      {
        kind: 'rect',
        points: [
          { x: 408, y: 160 },
          { x: 520, y: 160 },
          { x: 520, y: 192 },
          { x: 408, y: 192 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'backdrop',
          occludesBelow: true,
          strokePolicy: 'always',
        },
      },
      {
        kind: 'text',
        point: { x: 408, y: 176 },
        text: 'init themes',
        textAlign: 'left',
        textBaseline: 'middle',
        layer: AsciiLayer.TEXT,
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const text = normalized.find(op => op.kind === 'text') as Extract<DrawOp, { kind: 'text' }>

    expect(text.point.x).toBeGreaterThanOrEqual(416)
    expect(text.point.x).toBeLessThan(440)
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
        layer: AsciiLayer.TEXT,
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

  it('prefers moving middle-baseline text upward off semantic separator rows', () => {
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
        point: { x: 96, y: 72 },
        text: 'PERSON',
        textAlign: 'center',
        textBaseline: 'middle',
        layer: AsciiLayer.TEXT,
      },
    ]

    const normalized = normalizeDrawOps(ops, { cellWidth: 8, cellHeight: 16 })
    const text = normalized.find(op => op.kind === 'text') as Extract<DrawOp, { kind: 'text' }>

    expect(text.point.y).toBe(48)
  })
})
