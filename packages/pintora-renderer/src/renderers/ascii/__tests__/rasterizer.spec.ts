import { DrawOp } from '../ops'
import { rasterize } from '../rasterizer'

describe('rasterizer', () => {
  it('renders corner, junction, diagonal and text priority', () => {
    const ops: DrawOp[] = [
      { kind: 'segment', p0: { x: 0, y: 16 }, p1: { x: 32, y: 16 }, layer: 2 },
      { kind: 'segment', p0: { x: 16, y: 0 }, p1: { x: 16, y: 32 }, layer: 2 },
      { kind: 'segment', p0: { x: 24, y: 0 }, p1: { x: 24, y: 32 }, layer: 2 },
      { kind: 'segment', p0: { x: 0, y: 0 }, p1: { x: 16, y: 0 }, layer: 2 },
      { kind: 'segment', p0: { x: 0, y: 0 }, p1: { x: 0, y: 16 }, layer: 2 },
      { kind: 'segment', p0: { x: 48, y: 0 }, p1: { x: 32, y: 16 }, layer: 2 },
      { kind: 'text', point: { x: 16, y: 16 }, text: 'A', textAlign: 'left', textBaseline: 'top', layer: 3 },
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
})
