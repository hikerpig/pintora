import { charWidth, textDisplayWidth } from './char-width'
import { TextGrid } from './grid'
import { DrawOp, SegmentOp, TextOp } from './ops'
import { calcTextTopLeft } from './text-layout'
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

function drawText(grid: TextGrid, op: TextOp, options: RasterizeOptions): void {
  const lines = op.text.split('\n')
  const inferredWidth = Math.max(...lines.map(line => textDisplayWidth(line)), 0) * options.cellWidth
  const inferredHeight = lines.length * options.cellHeight
  const width = Number(op.width ?? inferredWidth)
  const height = Number(op.height ?? inferredHeight)
  const { left, top } = calcTextTopLeft(op.point.x, op.point.y, width, height, op.textAlign, op.textBaseline)
  const baseCol = Math.round(left / options.cellWidth)
  const baseRow = Math.round(top / options.cellHeight)
  const lineHeight = Number(op.lineHeight || options.cellHeight)

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const row = baseRow + Math.round((lineIndex * lineHeight) / options.cellHeight)
    let col = baseCol
    for (const ch of Array.from(lines[lineIndex])) {
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
  const ordered = [...ops].sort((a, b) => a.layer - b.layer)
  for (const op of ordered) {
    if (op.kind === 'segment') {
      drawSegment(grid, op, options)
      continue
    }
    drawText(grid, op, options)
  }
  return grid
}
