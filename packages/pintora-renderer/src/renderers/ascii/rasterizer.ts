import { charWidth } from './char-width'
import {
  getConnectorShaftGlyph,
  getHorizontalTerminatorGlyph,
  getVerticalConnectorShaftGlyph,
  getVerticalTerminatorGlyph,
} from './connector-glyphs'
import { TextGrid } from './grid'
import { AsciiLayer, ConnectorOp, DrawOp, RectOp, SegmentOp, TextOp } from './ops'
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

  for (const repair of op.repairs || []) {
    if (repair.kind === 'clear-horizontal-lines') {
      grid.clearHorizontalLineRange(repair.row, repair.minCol, repair.maxCol, op.layer - 1)
    }
  }

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

function drawGlyphString(grid: TextGrid, col: number, row: number, text: string, priority: number): void {
  let cursor = col
  for (const ch of Array.from(text)) {
    const widthInCells = charWidth(ch)
    if (widthInCells <= 0) continue
    grid.setText(cursor, row, ch, priority)
    if (widthInCells > 1) {
      for (let i = 1; i < widthInCells; i++) {
        grid.setTextContinuation(cursor + i, row, priority)
      }
    }
    cursor += widthInCells
  }
}

function drawVerticalGlyphString(grid: TextGrid, col: number, row: number, text: string, priority: number): void {
  let cursor = row
  for (const ch of Array.from(text)) {
    const widthInCells = charWidth(ch)
    if (widthInCells <= 0) continue
    grid.setText(col, cursor, ch, priority)
    cursor += 1
  }
}

function drawHorizontalCompactConnector(grid: TextGrid, op: ConnectorOp, options: RasterizeOptions): boolean {
  const connector = op.semantic.connector
  const glyph = getConnectorShaftGlyph(connector, options.charset)
  if (!glyph) return false

  const start = lineToGrid(op.points[0], options)
  const end = lineToGrid(op.points[op.points.length - 1], options)
  if (start.row !== end.row) return false

  const row = start.row
  const leftCol = Math.min(start.col, end.col)
  const rightCol = Math.max(start.col, end.col)
  const direction = end.col >= start.col ? 'right' : 'left'

  const startGlyph = getHorizontalTerminatorGlyph(connector.startTerminator?.kind || 'none', 'left', options.charset)
  const endGlyph = getHorizontalTerminatorGlyph(connector.endTerminator?.kind || 'none', 'right', options.charset)
  if (startGlyph == null || endGlyph == null) return false

  const startReserved = Array.from(startGlyph).reduce((sum, ch) => sum + Math.max(1, charWidth(ch)), 0)
  const endReserved = Array.from(endGlyph).reduce((sum, ch) => sum + Math.max(1, charWidth(ch)), 0)

  const shaftStartCol = leftCol + startReserved
  const shaftEndCol = rightCol - endReserved

  if (startGlyph) {
    drawGlyphString(grid, leftCol, row, startGlyph, AsciiLayer.MARKERS)
  }
  if (endGlyph) {
    drawGlyphString(grid, rightCol - endReserved + 1, row, endGlyph, AsciiLayer.MARKERS)
  }

  for (let col = shaftStartCol; col <= shaftEndCol; col++) {
    grid.setText(col, row, glyph, op.layer)
  }

  if (direction === 'left') {
    const leftFacingStart = getHorizontalTerminatorGlyph(
      connector.startTerminator?.kind || 'none',
      'right',
      options.charset,
    )
    const leftFacingEnd = getHorizontalTerminatorGlyph(connector.endTerminator?.kind || 'none', 'left', options.charset)
    if (leftFacingStart == null || leftFacingEnd == null) return false
    grid.clearRect(leftCol, row, rightCol, row, AsciiLayer.MARKERS)
    const leftEndReserved = Array.from(leftFacingEnd).reduce((sum, ch) => sum + Math.max(1, charWidth(ch)), 0)
    const rightStartReserved = Array.from(leftFacingStart).reduce((sum, ch) => sum + Math.max(1, charWidth(ch)), 0)
    if (leftFacingEnd) drawGlyphString(grid, leftCol, row, leftFacingEnd, AsciiLayer.MARKERS)
    if (leftFacingStart)
      drawGlyphString(grid, rightCol - rightStartReserved + 1, row, leftFacingStart, AsciiLayer.MARKERS)
    for (let col = leftCol + leftEndReserved; col <= rightCol - rightStartReserved; col++) {
      grid.setText(col, row, glyph, op.layer)
    }
  }

  return true
}

function drawConnectorFallback(grid: TextGrid, op: ConnectorOp, options: RasterizeOptions): void {
  for (let i = 1; i < op.points.length; i++) {
    drawSegment(
      grid,
      {
        kind: 'segment',
        p0: op.points[i - 1],
        p1: op.points[i],
        layer: op.layer,
        semantic: op.semantic,
      },
      options,
    )
  }
}

function drawVerticalCompactConnector(grid: TextGrid, op: ConnectorOp, options: RasterizeOptions): boolean {
  const connector = op.semantic.connector
  const glyph = getVerticalConnectorShaftGlyph(connector, options.charset)
  if (!glyph) return false
  const start = lineToGrid(op.points[0], options)
  const end = lineToGrid(op.points[op.points.length - 1], options)
  if (start.col !== end.col) return false

  const col = start.col
  const topRow = Math.min(start.row, end.row)
  const bottomRow = Math.max(start.row, end.row)
  const startIsTop = start.row <= end.row

  const topGlyph = getVerticalTerminatorGlyph(
    startIsTop ? connector.startTerminator?.kind || 'none' : connector.endTerminator?.kind || 'none',
    'up',
    options.charset,
  )
  const bottomGlyph = getVerticalTerminatorGlyph(
    startIsTop ? connector.endTerminator?.kind || 'none' : connector.startTerminator?.kind || 'none',
    'down',
    options.charset,
  )
  if (topGlyph == null || bottomGlyph == null) return false

  const topReserved = Array.from(topGlyph).length
  const bottomReserved = Array.from(bottomGlyph).length

  if (topGlyph) {
    drawVerticalGlyphString(grid, col, topRow, topGlyph, AsciiLayer.MARKERS)
  }
  if (bottomGlyph) {
    drawVerticalGlyphString(grid, col, bottomRow - bottomReserved + 1, bottomGlyph, AsciiLayer.MARKERS)
  }

  for (let row = topRow + topReserved; row <= bottomRow - bottomReserved; row++) {
    grid.setText(col, row, glyph, op.layer)
  }

  return true
}

function drawConnector(grid: TextGrid, op: ConnectorOp, options: RasterizeOptions): void {
  const start = lineToGrid(op.points[0], options)
  const end = lineToGrid(op.points[op.points.length - 1], options)

  if (op.semantic.connector.compact && start.row === end.row && drawHorizontalCompactConnector(grid, op, options)) {
    return
  }

  if (op.semantic.connector.compact && start.col === end.col && drawVerticalCompactConnector(grid, op, options)) {
    return
  }

  drawConnectorFallback(grid, op, options)
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
    if (op.kind === 'connector') {
      drawConnector(grid, op, options)
      continue
    }
    drawText(grid, op, options)
  }
  return grid
}
