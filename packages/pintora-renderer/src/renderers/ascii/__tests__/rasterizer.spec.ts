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
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
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
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
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
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
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
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
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

  it('clears lower-priority horizontal strokes across a centered title row', () => {
    const ops: DrawOp[] = [
      {
        kind: 'segment',
        p0: { x: 8, y: 32 },
        p1: { x: 72, y: 32 },
        layer: AsciiLayer.LINES,
      },
      {
        kind: 'text',
        point: { x: 40, y: 32 },
        text: 'PERSON',
        textAlign: 'left',
        textBaseline: 'top',
        repairs: [
          {
            kind: 'clear-horizontal-lines',
            row: 2,
            minCol: 1,
            maxCol: 9,
          },
        ],
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 6,
      trimRight: true,
    })

    expect(grid.getGlyphAt(1, 2)).toBe(' ')
    expect(grid.getGlyphAt(5, 2)).toBe('P')
    expect(grid.getGlyphAt(9, 2)).toBe('O')
    expect(grid.getGlyphAt(10, 2)).toBe('N')
  })

  it('renders compact connector glyphs for semantic sequence arrows', () => {
    const ops = [
      {
        kind: 'connector',
        points: [
          { x: 8, y: 16 },
          { x: 72, y: 16 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'connector',
          strokePolicy: 'always',
          connector: {
            family: 'sequence-message',
            compact: true,
            shaftStyle: 'solid',
            startTerminator: { kind: 'none' },
            endTerminator: { kind: 'arrow-open' },
          },
        },
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 4,
      trimRight: true,
    })

    expect(grid.toString()).toContain('▷')
    expect(grid.toString()).toContain('─')
  })

  it('falls back to geometric rasterization for unsupported compact connector geometry', () => {
    const ops = [
      {
        kind: 'connector',
        points: [
          { x: 8, y: 16 },
          { x: 40, y: 32 },
          { x: 72, y: 48 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'connector',
          strokePolicy: 'always',
          connector: {
            family: 'sequence-message',
            compact: true,
            shaftStyle: 'solid',
            startTerminator: { kind: 'none' },
            endTerminator: { kind: 'arrow-filled' },
          },
        },
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 4,
      trimRight: true,
    })

    expect(grid.toString().split('\n').filter(Boolean).length).toBeGreaterThan(1)
    expect(grid.toString()).not.toContain('▶')
  })

  it('renders compact glyphs for semantic symbols', () => {
    const ops = [
      {
        kind: 'symbol',
        point: { x: 16, y: 16 },
        width: 16,
        height: 16,
        layer: AsciiLayer.TEXT,
        semantic: {
          role: 'symbol',
          strokePolicy: 'always',
          symbol: {
            family: 'activity-node',
            kind: 'activity-start',
            compact: true,
          },
        },
        fallbackOps: [],
      },
      {
        kind: 'symbol',
        point: { x: 40, y: 16 },
        width: 16,
        height: 16,
        layer: AsciiLayer.TEXT,
        semantic: {
          role: 'symbol',
          strokePolicy: 'always',
          symbol: {
            family: 'component-node',
            kind: 'component-interface',
            compact: true,
          },
        },
        fallbackOps: [],
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 8,
      rows: 4,
      trimRight: true,
    })

    expect(grid.getGlyphAt(2, 1)).toBe('●')
    expect(grid.getGlyphAt(5, 0)).toBe('○')
  })

  it('falls back to geometric rasterization for unsupported semantic symbols', () => {
    const ops = [
      {
        kind: 'symbol',
        point: { x: 16, y: 16 },
        width: 16,
        height: 16,
        layer: AsciiLayer.TEXT,
        semantic: {
          role: 'symbol',
          strokePolicy: 'always',
          symbol: {
            family: 'activity-node',
            kind: 'unknown-symbol',
            compact: true,
          },
        },
        fallbackOps: [
          {
            kind: 'segment',
            p0: { x: 8, y: 16 },
            p1: { x: 24, y: 16 },
            layer: AsciiLayer.LINES,
          },
        ],
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 6,
      rows: 4,
      trimRight: true,
    })

    expect(grid.getGlyphAt(1, 1)).toBe('─')
    expect(grid.toString()).not.toContain('@')
  })

  it('renders quoted-card note frames', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 8, y: 16 },
          { x: 56, y: 16 },
          { x: 56, y: 48 },
          { x: 8, y: 48 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'backdrop',
          occludesBelow: true,
          strokePolicy: 'always',
          frame: {
            family: 'annotation',
            kind: 'note',
            compact: true,
            borderStyle: 'note-card',
          },
        } as any,
      },
      {
        kind: 'text',
        point: { x: 32, y: 32 },
        text: 'note',
        textAlign: 'center',
        textBaseline: 'middle',
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 10,
      rows: 5,
      trimRight: true,
    })

    const lines = grid.toString().split('\n')
    expect(lines[1]).toContain('╭')
    expect(lines[1]).toContain('┬')
    expect(lines[2]).toContain('note')
    expect(lines[3]).toContain('╰')
  })

  it('renders folded-corner note frames in unicode', () => {
    const ops: DrawOp[] = [
      {
        kind: 'rect',
        points: [
          { x: 8, y: 16 },
          { x: 72, y: 16 },
          { x: 72, y: 64 },
          { x: 8, y: 64 },
        ],
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'backdrop',
          occludesBelow: true,
          strokePolicy: 'always',
          frame: {
            family: 'annotation',
            kind: 'note',
            compact: true,
            borderStyle: 'note-card',
          },
        } as any,
      },
      {
        kind: 'text',
        point: { x: 40, y: 40 },
        text: 'memo',
        textAlign: 'center',
        textBaseline: 'middle',
        layer: AsciiLayer.TEXT,
      },
    ]

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 6,
      trimRight: true,
    })

    const lines = grid.toString().split('\n').filter(Boolean)
    expect(lines[0]).toMatch(/╭.*┬╮/)
    expect(lines[1] || '').toMatch(/╰│|││/)
    expect(lines[lines.length - 1]).toMatch(/╰.*╯/)
  })

  it('renders decision frames with decorated unicode corners', () => {
    const ops = [
      {
        kind: 'frame',
        point: { x: 40, y: 32 },
        width: 64,
        height: 48,
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'container',
          strokePolicy: 'always',
          frame: {
            family: 'activity-node',
            kind: 'decision',
            compact: true,
            borderStyle: 'solid',
            cornerStyle: 'decision',
          },
        },
        fallbackOps: [],
      },
      {
        kind: 'text',
        point: { x: 40, y: 32 },
        text: 'Decision',
        textAlign: 'center',
        textBaseline: 'middle',
        layer: AsciiLayer.TEXT,
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 12,
      rows: 6,
      trimRight: true,
    })

    const rendered = grid.toString()
    expect(rendered).toContain('◇')
    expect(rendered).toContain('Decision')
  })

  it('falls back to geometric rendering for unsupported semantic frames', () => {
    const ops = [
      {
        kind: 'frame',
        point: { x: 16, y: 16 },
        width: 32,
        height: 16,
        layer: AsciiLayer.LINES,
        semantic: {
          role: 'container',
          strokePolicy: 'always',
          frame: {
            family: 'annotation',
            kind: 'unknown-frame',
            compact: true,
            borderStyle: 'solid',
          },
        },
        fallbackOps: [
          {
            kind: 'segment',
            p0: { x: 8, y: 16 },
            p1: { x: 24, y: 16 },
            layer: AsciiLayer.LINES,
          },
        ],
      },
    ] as any

    const grid = rasterize(ops, {
      cellWidth: 8,
      cellHeight: 16,
      cols: 6,
      rows: 4,
      trimRight: true,
    })

    expect(grid.getGlyphAt(1, 1)).toBe('─')
  })
})
