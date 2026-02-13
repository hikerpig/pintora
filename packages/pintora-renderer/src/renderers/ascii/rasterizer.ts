import { charWidth } from './char-width'
import { TextGrid } from './grid'
import { DrawOp, RectOp, SegmentOp, TextOp } from './ops'
import { normalizeDrawOps } from './normalize-ops'
import { measureAsciiText } from './text-metrics'
import { resolveTextPlacement } from './text-layout'
import { Charset, Point } from './types'

export type RasterizeOptions = {
  charset: Charset
  cellWidth: number
  cellHeight: number
  cols: number
  rows: number
  trimRight: boolean
}

function lineToGrid(point: Point, options: RasterizeOptions): { col: number; row: number } {
  return {
    col: Math.round(point.x / options.cellWidth),
    row: Math.round(point.y / options.cellHeight),
  }
}

function drawSegment(grid: TextGrid, op: SegmentOp, options: RasterizeOptions): void {
  if (op.semantic?.strokePolicy === 'none' || op.semantic?.strokePolicy === 'optional') {
    return
  }
  const { col: c0, row: r0 } = lineToGrid(op.p0, options)
  const { col: c1, row: r1 } = lineToGrid(op.p1, options)

  if (Math.max(c0, c1) < 0 || Math.max(r0, r1) < 0 || Math.min(c0, c1) >= grid.cols || Math.min(r0, r1) >= grid.rows) {
    return
  }

  let x = c0
  let y = r0
  const dx = Math.abs(c1 - c0)
  const sx = c0 < c1 ? 1 : -1
  const dy = -Math.abs(r1 - r0)
  const sy = r0 < r1 ? 1 : -1
  let err = dx + dy

  while (!(x === c1 && y === r1)) {
    const e2 = 2 * err
    let nx = x
    let ny = y
    if (e2 >= dy) {
      err += dy
      nx += sx
    }
    if (e2 <= dx) {
      err += dx
      ny += sy
    }
    grid.addLineConnection(x, y, nx, ny, op.layer)
    x = nx
    y = ny
  }
}

function drawRect(grid: TextGrid, op: RectOp, options: RasterizeOptions): void {
  const xs = op.points.map(point => point.x)
  const ys = op.points.map(point => point.y)
  const minCol = Math.floor(Math.min(...xs) / options.cellWidth)
  const maxCol = Math.ceil(Math.max(...xs) / options.cellWidth)
  const minRow = Math.floor(Math.min(...ys) / options.cellHeight)
  const maxRow = Math.ceil(Math.max(...ys) / options.cellHeight)

  if (op.semantic?.role === 'backdrop' && op.semantic.occludesBelow) {
    grid.clearRect(minCol, minRow, maxCol, maxRow, op.layer)
  }

  if (op.semantic?.strokePolicy === 'none' || op.semantic?.strokePolicy === 'optional') {
    return
  }

  const borderSegments: SegmentOp[] = [
    { kind: 'segment', p0: op.points[0], p1: op.points[1], layer: op.layer },
    { kind: 'segment', p0: op.points[1], p1: op.points[2], layer: op.layer },
    { kind: 'segment', p0: op.points[2], p1: op.points[3], layer: op.layer },
    { kind: 'segment', p0: op.points[3], p1: op.points[0], layer: op.layer },
  ]
  borderSegments.forEach(segment => drawSegment(grid, segment, options))
}

function drawText(grid: TextGrid, op: TextOp, options: RasterizeOptions): void {
  const metrics = measureAsciiText(op.text, {
    cellWidth: options.cellWidth,
    cellHeight: options.cellHeight,
    lineHeight: op.lineHeight,
  })
  const placement = resolveTextPlacement({
    x: op.point.x,
    y: op.point.y,
    width: metrics.textWidth,
    height: metrics.textHeight,
    cellWidth: options.cellWidth,
    cellHeight: options.cellHeight,
    textAlign: op.textAlign,
    textBaseline: op.textBaseline,
  })

  for (let lineIndex = 0; lineIndex < metrics.lines.length; lineIndex++) {
    const row = placement.row + lineIndex * metrics.lineHeightRows
    let col = placement.col
    for (const ch of Array.from(metrics.lines[lineIndex])) {
      const widthInCells = charWidth(ch)
      if (widthInCells <= 0) continue
      grid.setText(col, row, ch, op.layer)
      if (widthInCells > 1) {
        for (let i = 1; i < widthInCells; i++) {
          grid.setTextContinuation(col + i, row, op.layer)
        }
      }
      col += widthInCells
    }
  }
}

export function rasterize(ops: DrawOp[], options: RasterizeOptions): TextGrid {
  const grid = new TextGrid(options.cols, options.rows, options.charset, options.trimRight)
  const normalized = normalizeDrawOps(ops, {
    cellWidth: options.cellWidth,
    cellHeight: options.cellHeight,
  })
  const ordered = [...normalized].sort((a, b) => a.layer - b.layer)
  for (const op of ordered) {
    if (op.kind === 'segment') {
      drawSegment(grid, op, options)
      continue
    }
    if (op.kind === 'rect') {
      drawRect(grid, op, options)
      continue
    }
    drawText(grid, op, options)
  }
  return grid
}
