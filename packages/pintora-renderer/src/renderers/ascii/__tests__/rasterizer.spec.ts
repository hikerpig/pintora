import { AsciiLayer, DrawOp } from '../ops'
import { rasterize } from '../rasterizer'

describe('rasterizer', () => {
  it('renders corner, junction, diagonal and text priority', () => {
    const ops: DrawOp[] = [
      { kind: 'segment', p0: { x: 0, y: 16 }, p1: { x: 32, y: 16 }, layer: AsciiLayer.LINES },
      { kind: 'segment', p0: { x: 16, y: 0 }, p1: { x: 16, y: 32 }, layer: AsciiLayer.LINES },
      { kind: 'segment', p0: { x: 24, y: 0 }, p1: { x: 24, y: 32 }, layer: AsciiLayer.LINES },
      { kind: 'segment', p0: { x: 0, y: 0 }, p1: { x: 16, y: 0 }, layer: AsciiLayer.LINES },
      { kind: 'segment', p0: { x: 0, y: 0 }, p1: { x: 0, y: 16 }, layer: AsciiLayer.LINES },
      { kind: 'segment', p0: { x: 48, y: 0 }, p1: { x: 32, y: 16 }, layer: AsciiLayer.LINES },
      {
        kind: 'text',
        point: { x: 16, y: 16 },
        text: 'A',
        textAlign: 'left',
        textBaseline: 'top',
        layer: AsciiLayer.MARKERS,
      },
    ]

    const grid = rasterize(ops, {
      charset: 'unicode',
      cellWidth: 8,
      cellHeight: 16,
      cols: 10,
      rows: 6,
      trimRight: true,
    })
    const rendered = grid.toString()

    expect(rendered).toContain('┼')
    expect(rendered).toContain('┌')
    expect(rendered).toContain('/')
    expect(grid.getGlyphAt(2, 1)).toBe('A')
  })

  it('uses backdrop rect semantics to clear lower lines and omit optional strokes', () => {
    const ops: DrawOp[] = [
      { kind: 'segment', p0: { x: 0, y: 16 }, p1: { x: 64, y: 16 }, layer: AsciiLayer.LINES },
      {
        kind: 'rect',
        points: [
          { x: 16, y: 8 },
          { x: 48, y: 8 },
          { x: 48, y: 24 },
          { x: 16, y: 24 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'backdrop',
          occludesBelow: true,
          strokePolicy: 'optional',
        },
      },
      {
        kind: 'text',
        point: { x: 32, y: 16 },
        text: 'A',
        textAlign: 'center',
        textBaseline: 'middle',
        layer: AsciiLayer.MARKERS,
      },
    ]

    const grid = rasterize(ops, {
      charset: 'unicode',
      cellWidth: 8,
      cellHeight: 16,
      cols: 10,
      rows: 6,
      trimRight: true,
    })

    expect(grid.getGlyphAt(4, 1)).toBe('A')
    expect(grid.getGlyphAt(2, 1)).toBe(' ')
    expect(grid.getGlyphAt(5, 1)).toBe(' ')
  })

  it('snaps semantic separator segments to avoid hanging-text row collisions', () => {
    const ops: DrawOp[] = [
      {
        kind: 'segment',
        p0: { x: 0, y: 27.1 },
        p1: { x: 64, y: 27.1 },
        layer: AsciiLayer.LINES,
        semantic: { role: 'separator' },
      },
      {
        kind: 'text',
        point: { x: 16, y: 31.1 },
        text: 'ABC',
        textAlign: 'left',
        textBaseline: 'hanging',
        layer: AsciiLayer.MARKERS,
      },
    ]

    const grid = rasterize(ops, {
      charset: 'unicode',
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 6,
      trimRight: true,
    })

    // text row should not be pierced by the separator tail
    expect(grid.getGlyphAt(2, 2)).toBe('A')
    expect(grid.getGlyphAt(5, 2)).toBe(' ')
    expect(grid.getGlyphAt(0, 1)).toBe('─')
  })

  it('keeps text inside semantic container inner rows and cols', () => {
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

    const grid = rasterize(ops, {
      charset: 'unicode',
      cellWidth: 8,
      cellHeight: 16,
      cols: 16,
      rows: 8,
      trimRight: true,
    })

    // text should be clamped away from container border cells
    expect(grid.getGlyphAt(3, 2)).toBe('A')
    expect(grid.getGlyphAt(2, 2)).not.toBe('A')
  })
})
