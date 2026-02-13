import { DrawOp, RectOp, SegmentOp, TextOp } from './ops'
import { measureAsciiText } from './text-metrics'
import { resolveTextPlacement } from './text-layout'

export type NormalizeOptions = {
  cellWidth: number
  cellHeight: number
}

type ContainerBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

type HorizontalSeparator = {
  row: number
  minCol: number
  maxCol: number
}

type InnerBounds = {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

function collectContainers(ops: DrawOp[], options: NormalizeOptions): ContainerBounds[] {
  return ops
    .filter((op): op is RectOp => op.kind === 'rect' && op.semantic?.role === 'container')
    .map(op => {
      const xs = op.points.map(point => point.x)
      const ys = op.points.map(point => point.y)
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        minCol: Math.floor(Math.min(...xs) / options.cellWidth),
        maxCol: Math.ceil(Math.max(...xs) / options.cellWidth),
        minRow: Math.floor(Math.min(...ys) / options.cellHeight),
        maxRow: Math.ceil(Math.max(...ys) / options.cellHeight),
      }
    })
}

function findContainerForText(op: TextOp, containers: ContainerBounds[]): ContainerBounds | undefined {
  return containers.find(
    container =>
      op.point.x >= container.minX &&
      op.point.x <= container.maxX &&
      op.point.y >= container.minY &&
      op.point.y <= container.maxY,
  )
}

function clampTextPlacementToContainer(
  placement: { col: number; row: number },
  bounds: InnerBounds,
): { col: number; row: number } {
  return {
    col: Math.max(bounds.minCol, Math.min(placement.col, bounds.maxCol)),
    row: Math.max(bounds.minRow, Math.min(placement.row, bounds.maxRow)),
  }
}

function getInnerBounds(container: ContainerBounds, metrics: ReturnType<typeof measureAsciiText>): InnerBounds | null {
  const innerMinCol = container.minCol + 1
  const innerMaxCol = container.maxCol - metrics.textWidthCells
  const innerMinRow = container.minRow + 1
  const innerMaxRow = container.maxRow - metrics.textHeightRows

  if (innerMinCol > innerMaxCol || innerMinRow > innerMaxRow) {
    return null
  }

  return {
    minCol: innerMinCol,
    maxCol: innerMaxCol,
    minRow: innerMinRow,
    maxRow: innerMaxRow,
  }
}

function collectHorizontalSeparators(ops: DrawOp[], options: NormalizeOptions): HorizontalSeparator[] {
  return ops
    .filter((op): op is SegmentOp => op.kind === 'segment' && op.semantic?.role === 'separator')
    .map(op => {
      const row = Math.round(op.p0.y / options.cellHeight)
      const c0 = Math.round(op.p0.x / options.cellWidth)
      const c1 = Math.round(op.p1.x / options.cellWidth)
      return {
        row,
        minCol: Math.min(c0, c1),
        maxCol: Math.max(c0, c1),
      }
    })
}

function isTextOnSeparatorRow(params: {
  row: number
  col: number
  metrics: ReturnType<typeof measureAsciiText>
  separators: HorizontalSeparator[]
}): boolean {
  const { row, col, metrics, separators } = params
  const textMinCol = col
  const textMaxCol = col + metrics.textWidthCells - 1

  for (let i = 0; i < metrics.lines.length; i++) {
    const lineRow = row + i * metrics.lineHeightRows
    for (const separator of separators) {
      if (separator.row !== lineRow) continue
      const overlaps = textMinCol <= separator.maxCol && textMaxCol >= separator.minCol
      if (overlaps) return true
    }
  }
  return false
}

function moveTextOffSeparatorRows(params: {
  row: number
  col: number
  metrics: ReturnType<typeof measureAsciiText>
  bounds: InnerBounds
  separators: HorizontalSeparator[]
}): number {
  const { row, col, metrics, bounds, separators } = params
  if (!isTextOnSeparatorRow({ row, col, metrics, separators })) {
    return row
  }

  const maxShift = Math.max(row - bounds.minRow, bounds.maxRow - row)
  for (let delta = 1; delta <= maxShift; delta++) {
    const down = row + delta
    if (down <= bounds.maxRow && !isTextOnSeparatorRow({ row: down, col, metrics, separators })) {
      return down
    }
    const up = row - delta
    if (up >= bounds.minRow && !isTextOnSeparatorRow({ row: up, col, metrics, separators })) {
      return up
    }
  }

  return row
}

function normalizeSegment(op: SegmentOp, options: NormalizeOptions): SegmentOp {
  if (op.semantic?.role !== 'separator') return op

  const dx = op.p1.x - op.p0.x
  const dy = op.p1.y - op.p0.y
  const horizontal = Math.abs(dy) < 1e-6
  const vertical = Math.abs(dx) < 1e-6

  if (horizontal) {
    const row = Math.floor(op.p0.y / options.cellHeight)
    const snappedY = row * options.cellHeight
    return {
      ...op,
      p0: { ...op.p0, y: snappedY },
      p1: { ...op.p1, y: snappedY },
    }
  }

  if (vertical) {
    const col = Math.floor(op.p0.x / options.cellWidth)
    const snappedX = col * options.cellWidth
    return {
      ...op,
      p0: { ...op.p0, x: snappedX },
      p1: { ...op.p1, x: snappedX },
    }
  }

  return op
}

function normalizeText(
  op: TextOp,
  options: NormalizeOptions,
  containers: ContainerBounds[],
  separators: HorizontalSeparator[],
): TextOp {
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

  let col = placement.col
  let row = placement.row

  const container = findContainerForText(op, containers)
  if (container) {
    const innerBounds = getInnerBounds(container, metrics)
    if (innerBounds) {
      const clamped = clampTextPlacementToContainer({ col, row }, innerBounds)
      col = clamped.col
      row = clamped.row

      const containerSeparators = separators.filter(
        separator =>
          separator.row >= innerBounds.minRow &&
          separator.row <= innerBounds.maxRow &&
          separator.maxCol >= innerBounds.minCol &&
          separator.minCol <= innerBounds.maxCol,
      )

      row = moveTextOffSeparatorRows({
        row,
        col,
        metrics,
        bounds: innerBounds,
        separators: containerSeparators,
      })
    }
  }

  return {
    ...op,
    point: {
      x: col * options.cellWidth,
      y: row * options.cellHeight,
    },
    textAlign: 'left',
    textBaseline: 'top',
    width: metrics.textWidth,
    height: metrics.textHeight,
  }
}

export function normalizeDrawOps(ops: DrawOp[], options: NormalizeOptions): DrawOp[] {
  const containers = collectContainers(ops, options)
  const normalizedSegments = ops.map(op => (op.kind === 'segment' ? normalizeSegment(op, options) : op))
  const separators = collectHorizontalSeparators(normalizedSegments, options)

  return normalizedSegments.map(op => {
    if (op.kind === 'text') return normalizeText(op, options, containers, separators)
    return op
  })
}
