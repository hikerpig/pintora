import { ConnectorOp, DrawOp, RectOp, SegmentOp, TextOp } from './ops'
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
  leftBorderCol: number
  rightBorderCol: number
  topBorderRow: number
  bottomBorderRow: number
}

type TextRegionBounds = ContainerBounds
type TextRegionBoundsWithSemantic = TextRegionBounds & {
  index: number
  semantic?: RectOp['semantic']
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

type SharedContainerBorders = {
  minXWithMatchingMax: Set<string>
  maxXWithMatchingMin: Set<string>
  minYWithMatchingMax: Set<string>
  maxYWithMatchingMin: Set<string>
}

type RawContainerBounds = {
  index: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type RawRectBounds = RawContainerBounds & {
  semantic?: RectOp['semantic']
}

function axisIncludes(setting: ConnectorOp['semantic']['connector']['compactEndpointClearance'], axis: 'horizontal' | 'vertical') {
  return setting === 'both' || setting === axis
}

function clampRectSpan(params: { min: number; max: number; minSpan: number }): { min: number; max: number } {
  const { minSpan } = params
  let { min, max } = params
  if (max - min >= minSpan) {
    return { min, max }
  }

  const center = (min + max) / 2
  const halfSpan = minSpan / 2
  min = center - halfSpan
  max = center + halfSpan
  return { min, max }
}

function pointToGrid(point: { x: number; y: number }, options: NormalizeOptions): { col: number; row: number } {
  return {
    col: Math.round(point.x / options.cellWidth),
    row: Math.round(point.y / options.cellHeight),
  }
}

function makeBorderKey(value: number): string {
  return value.toFixed(3)
}

function collectSharedContainerBorders(ops: DrawOp[]): SharedContainerBorders {
  const minXs = new Set<string>()
  const maxXs = new Set<string>()
  const minYs = new Set<string>()
  const maxYs = new Set<string>()

  ops.forEach(op => {
    if (op.kind !== 'rect' || op.semantic?.role !== 'container') return
    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    minXs.add(makeBorderKey(Math.min(...xs)))
    maxXs.add(makeBorderKey(Math.max(...xs)))
    minYs.add(makeBorderKey(Math.min(...ys)))
    maxYs.add(makeBorderKey(Math.max(...ys)))
  })

  const minXWithMatchingMax = new Set<string>()
  const maxXWithMatchingMin = new Set<string>()
  const minYWithMatchingMax = new Set<string>()
  const maxYWithMatchingMin = new Set<string>()

  minXs.forEach(key => {
    if (maxXs.has(key)) minXWithMatchingMax.add(key)
  })
  maxXs.forEach(key => {
    if (minXs.has(key)) maxXWithMatchingMin.add(key)
  })
  minYs.forEach(key => {
    if (maxYs.has(key)) minYWithMatchingMax.add(key)
  })
  maxYs.forEach(key => {
    if (minYs.has(key)) maxYWithMatchingMin.add(key)
  })

  return {
    minXWithMatchingMax,
    maxXWithMatchingMin,
    minYWithMatchingMax,
    maxYWithMatchingMin,
  }
}

function shouldUseAsTextRegion(op: RectOp): boolean {
  if (op.semantic?.role === 'container') return true
  return op.semantic?.role === 'backdrop' && op.semantic.strokePolicy === 'always'
}

function collectTextRegions(ops: DrawOp[], options: NormalizeOptions): TextRegionBoundsWithSemantic[] {
  return ops.flatMap((op, index) => {
    if (op.kind !== 'rect' || !shouldUseAsTextRegion(op)) return []
    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return [
      {
        index,
        minX,
        maxX,
        minY,
        maxY,
        leftBorderCol: Math.round(minX / options.cellWidth),
        rightBorderCol: Math.round(maxX / options.cellWidth),
        topBorderRow: Math.round(minY / options.cellHeight),
        bottomBorderRow: Math.round(maxY / options.cellHeight),
        semantic: op.semantic,
      },
    ]
  })
}

function findContainerBorderTouch(
  point: { col: number; row: number },
  regions: TextRegionBoundsWithSemantic[],
): (TextRegionBoundsWithSemantic & { edge: 'top' | 'bottom' | 'left' | 'right' }) | undefined {
  const matches = regions.filter(region => {
    if (region.semantic?.role !== 'container') return false
    const withinCols = point.col >= region.leftBorderCol && point.col <= region.rightBorderCol
    const withinRows = point.row >= region.topBorderRow && point.row <= region.bottomBorderRow
    return (
      (withinCols && point.row === region.topBorderRow) ||
      (withinCols && point.row === region.bottomBorderRow) ||
      (withinRows && point.col === region.leftBorderCol) ||
      (withinRows && point.col === region.rightBorderCol)
    )
  })
  if (matches.length === 0) return

  const smallest = matches.reduce((current, candidate) => {
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    const candidateArea = (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY)
    return candidateArea < currentArea ? candidate : current
  })

  if (point.row === smallest.topBorderRow) return { ...smallest, edge: 'top' }
  if (point.row === smallest.bottomBorderRow) return { ...smallest, edge: 'bottom' }
  if (point.col === smallest.leftBorderCol) return { ...smallest, edge: 'left' }
  return { ...smallest, edge: 'right' }
}

function findContainingContainerRegion(
  point: { col: number; row: number },
  regions: TextRegionBoundsWithSemantic[],
): TextRegionBoundsWithSemantic | undefined {
  const matches = regions.filter(region => {
    if (region.semantic?.role !== 'container') return false
    return (
      point.col >= region.leftBorderCol &&
      point.col <= region.rightBorderCol &&
      point.row >= region.topBorderRow &&
      point.row <= region.bottomBorderRow
    )
  })
  if (matches.length === 0) return

  return matches.reduce((current, candidate) => {
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    const candidateArea = (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY)
    return candidateArea < currentArea ? candidate : current
  })
}

function findNearestContainerBelow(
  point: { col: number; row: number },
  regions: TextRegionBoundsWithSemantic[],
): TextRegionBoundsWithSemantic | undefined {
  const matches = regions.filter(region => {
    if (region.semantic?.role !== 'container') return false
    if (point.col < region.leftBorderCol || point.col > region.rightBorderCol) return false
    return region.topBorderRow > point.row
  })
  if (matches.length === 0) return

  return matches.reduce((current, candidate) => {
    if (candidate.topBorderRow !== current.topBorderRow) {
      return candidate.topBorderRow < current.topBorderRow ? candidate : current
    }
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    const candidateArea = (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY)
    return candidateArea < currentArea ? candidate : current
  })
}

function findNearestContainerRight(
  point: { col: number; row: number },
  regions: TextRegionBoundsWithSemantic[],
): TextRegionBoundsWithSemantic | undefined {
  const matches = regions.filter(region => {
    if (region.semantic?.role !== 'container') return false
    if (point.row < region.topBorderRow || point.row > region.bottomBorderRow) return false
    return region.leftBorderCol > point.col
  })
  if (matches.length === 0) return

  return matches.reduce((current, candidate) => {
    if (candidate.leftBorderCol !== current.leftBorderCol) {
      return candidate.leftBorderCol < current.leftBorderCol ? candidate : current
    }
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    const candidateArea = (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY)
    return candidateArea < currentArea ? candidate : current
  })
}

function findNearestContainerLeft(
  point: { col: number; row: number },
  regions: TextRegionBoundsWithSemantic[],
): TextRegionBoundsWithSemantic | undefined {
  const matches = regions.filter(region => {
    if (region.semantic?.role !== 'container') return false
    if (point.row < region.topBorderRow || point.row > region.bottomBorderRow) return false
    return region.rightBorderCol < point.col
  })
  if (matches.length === 0) return

  return matches.reduce((current, candidate) => {
    if (candidate.rightBorderCol !== current.rightBorderCol) {
      return candidate.rightBorderCol > current.rightBorderCol ? candidate : current
    }
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    const candidateArea = (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY)
    return candidateArea < currentArea ? candidate : current
  })
}

function translatePoint(point: { x: number; y: number }, dx: number, dy: number) {
  return {
    x: point.x + dx,
    y: point.y + dy,
  }
}

function translateOp(op: DrawOp, dx: number, dy: number): DrawOp {
  if (dx === 0 && dy === 0) return op

  switch (op.kind) {
    case 'rect':
      return {
        ...op,
        points: op.points.map(point => translatePoint(point, dx, dy)) as RectOp['points'],
      }
    case 'segment':
      return {
        ...op,
        p0: translatePoint(op.p0, dx, dy),
        p1: translatePoint(op.p1, dx, dy),
      }
    case 'connector':
      return {
        ...op,
        points: op.points.map(point => translatePoint(point, dx, dy)),
      }
    case 'symbol':
    case 'frame':
      return {
        ...op,
        point: translatePoint(op.point, dx, dy),
      }
    case 'text':
      return {
        ...op,
        point: translatePoint(op.point, dx, dy),
      }
  }
}

function translateConnectorEndpointIfTouchingRegion(
  op: ConnectorOp,
  region: TextRegionBoundsWithSemantic,
  options: NormalizeOptions,
  dx: number,
  dy: number,
): ConnectorOp {
  const points = [...op.points]
  let changed = false
  const startTouch = findContainerBorderTouch(pointToGrid(points[0], options), [region])
  const endTouch = findContainerBorderTouch(pointToGrid(points[points.length - 1], options), [region])

  if (startTouch) {
    points[0] = translatePoint(points[0], dx, dy)
    changed = true
  }
  if (endTouch) {
    points[points.length - 1] = translatePoint(points[points.length - 1], dx, dy)
    changed = true
  }

  return changed
    ? {
        ...op,
        points,
      }
    : op
}

function reserveCompactConnectorGaps(ops: DrawOp[], options: NormalizeOptions): DrawOp[] {
  let current = ops

  for (let iteration = 0; iteration < 8; iteration++) {
    const regions = collectTextRegions(current, options)
    let shifted = false

    for (const op of current) {
      if (op.kind !== 'connector') continue
      if (
        !op.semantic.connector.compact ||
        !axisIncludes(op.semantic.connector.compactLaneReservation, 'vertical') ||
        op.points.length < 2
      ) {
        continue
      }

      const start = pointToGrid(op.points[0], options)
      const end = pointToGrid(op.points[op.points.length - 1], options)
      if (start.col !== end.col || end.row <= start.row) continue

      const startTouch = findContainerBorderTouch(start, regions)
      const endTouch = findContainerBorderTouch(end, regions)
      const sourceRegion =
        (startTouch && startTouch.edge === 'bottom' ? startTouch : undefined) ||
        findContainingContainerRegion(start, regions)
      const targetRegion =
        (endTouch && endTouch.edge === 'top' ? endTouch : undefined) ||
        findNearestContainerBelow(end, regions) ||
        findContainingContainerRegion(end, regions)
      if (!sourceRegion || !targetRegion) continue

      const desiredStartRow = sourceRegion.bottomBorderRow + 1
      const desiredEndRow = targetRegion.topBorderRow - 1
      if (desiredStartRow <= desiredEndRow) continue

      const deltaRows = desiredStartRow - desiredEndRow
      const dy = deltaRows * options.cellHeight

      current = current.map((item, index) => {
        if (index === targetRegion.index) {
          return translateOp(item, 0, dy)
        }

        if (item.kind === 'text') {
          const insideX = item.point.x >= targetRegion.minX && item.point.x <= targetRegion.maxX
          const insideY = item.point.y >= targetRegion.minY && item.point.y <= targetRegion.maxY
          if (insideX && insideY) {
            return translateOp(item, 0, dy)
          }
          return item
        }

        if (item.kind === 'connector') {
          return translateConnectorEndpointIfTouchingRegion(item, targetRegion, options, 0, dy)
        }

        return item
      })

      shifted = true
      break
    }

    if (!shifted) {
      return current
    }
  }

  return current
}

function collectRawContainers(ops: DrawOp[]): RawContainerBounds[] {
  return ops.flatMap((op, index) => {
    if (op.kind !== 'rect' || op.semantic?.role !== 'container') return []
    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    return [
      {
        index,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
    ]
  })
}

function hasVisibleAsciiStroke(op: Extract<DrawOp, { kind: 'rect' }>): boolean {
  return op.semantic?.strokePolicy !== 'none' && op.semantic?.strokePolicy !== 'optional'
}

function collectRawVisibleRects(ops: DrawOp[]): RawRectBounds[] {
  return ops.flatMap((op, index) => {
    if (op.kind !== 'rect' || !hasVisibleAsciiStroke(op)) return []
    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    return [
      {
        index,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        semantic: op.semantic,
      },
    ]
  })
}

function findParentRawContainer(
  target: RawContainerBounds,
  containers: RawContainerBounds[],
): RawContainerBounds | undefined {
  const matches = containers.filter(
    container =>
      container.index !== target.index &&
      container.minX < target.minX &&
      container.maxX > target.maxX &&
      container.minY < target.minY &&
      container.maxY > target.maxY,
  )
  if (matches.length === 0) return

  return matches.reduce((smallest, current) => {
    const smallestArea = (smallest.maxX - smallest.minX) * (smallest.maxY - smallest.minY)
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    return currentArea < smallestArea ? current : smallest
  })
}

function preventNestedContainerBorderCollapse(
  ops: DrawOp[],
  rawContainers: RawContainerBounds[],
  options: NormalizeOptions,
): DrawOp[] {
  return ops.map((op, index) => {
    if (op.kind !== 'rect' || op.semantic?.role !== 'container') return op

    const rawContainer = rawContainers.find(container => container.index === index)
    if (!rawContainer) return op

    const parentRaw = findParentRawContainer(rawContainer, rawContainers)
    if (!parentRaw) return op

    const parentOp = ops[parentRaw.index]
    if (parentOp?.kind !== 'rect') return op

    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    const parentXs = parentOp.points.map(point => point.x)
    const parentYs = parentOp.points.map(point => point.y)

    let minX = Math.min(...xs)
    let maxX = Math.max(...xs)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)

    const parentMinX = Math.min(...parentXs)
    const parentMaxX = Math.max(...parentXs)
    const parentMinY = Math.min(...parentYs)
    const parentMaxY = Math.max(...parentYs)

    if (rawContainer.minX > parentRaw.minX && minX <= parentMinX) {
      minX = parentMinX + options.cellWidth
    }
    if (rawContainer.maxX < parentRaw.maxX && maxX >= parentMaxX) {
      maxX = parentMaxX - options.cellWidth
    }
    if (rawContainer.minY > parentRaw.minY && minY <= parentMinY) {
      minY = parentMinY + options.cellHeight
    }
    if (rawContainer.maxY < parentRaw.maxY && maxY >= parentMaxY) {
      maxY = parentMaxY - options.cellHeight
    }

    if (minX >= maxX || minY >= maxY) {
      return op
    }

    return {
      ...op,
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
    }
  })
}

function preventVisibleRectBorderOverlap(
  ops: DrawOp[],
  rawRects: RawRectBounds[],
  options: NormalizeOptions,
): DrawOp[] {
  return ops.map((op, index) => {
    if (op.kind !== 'rect' || !hasVisibleAsciiStroke(op)) return op

    const rawRect = rawRects.find(rect => rect.index === index)
    if (!rawRect) return op

    const xs = op.points.map(point => point.x)
    const ys = op.points.map(point => point.y)
    let minX = Math.min(...xs)
    let maxX = Math.max(...xs)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)

    for (const otherRaw of rawRects) {
      if (otherRaw.index === index) continue

      const overlapsY = rawRect.minY < otherRaw.maxY && rawRect.maxY > otherRaw.minY
      if (overlapsY) {
        const currentMaxCol = Math.round(maxX / options.cellWidth)
        const currentMinCol = Math.round(minX / options.cellWidth)
        const otherMinCol = Math.round(otherRaw.minX / options.cellWidth)
        const otherMaxCol = Math.round(otherRaw.maxX / options.cellWidth)

        if (rawRect.maxX < otherRaw.minX && currentMaxCol >= otherMinCol - 1) {
          maxX = Math.min(maxX, (otherMinCol - 2) * options.cellWidth)
        }
        if (rawRect.minX > otherRaw.maxX && currentMinCol <= otherMaxCol + 1) {
          minX = Math.max(minX, (otherMaxCol + 2) * options.cellWidth)
        }
      }

      const overlapsX = rawRect.minX < otherRaw.maxX && rawRect.maxX > otherRaw.minX
      if (overlapsX) {
        const currentMaxRow = Math.round(maxY / options.cellHeight)
        const currentMinRow = Math.round(minY / options.cellHeight)
        const otherMinRow = Math.round(otherRaw.minY / options.cellHeight)
        const otherMaxRow = Math.round(otherRaw.maxY / options.cellHeight)

        if (rawRect.maxY < otherRaw.minY && currentMaxRow >= otherMinRow - 1) {
          maxY = Math.min(maxY, (otherMinRow - 2) * options.cellHeight)
        }
        if (rawRect.minY > otherRaw.maxY && currentMinRow <= otherMaxRow + 1) {
          minY = Math.max(minY, (otherMaxRow + 2) * options.cellHeight)
        }
      }
    }

    const minRectWidth = options.cellWidth * 2
    const minRectHeight = options.cellHeight * 2
    ;({ min: minX, max: maxX } = clampRectSpan({ min: minX, max: maxX, minSpan: minRectWidth }))
    ;({ min: minY, max: maxY } = clampRectSpan({ min: minY, max: maxY, minSpan: minRectHeight }))

    if (minX >= maxX || minY >= maxY) {
      return op
    }

    return {
      ...op,
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
    }
  })
}

function findTextRegionForText(
  op: TextOp,
  regions: TextRegionBoundsWithSemantic[],
): TextRegionBoundsWithSemantic | undefined {
  const matches = regions.filter(
    region =>
      op.point.x >= region.minX && op.point.x <= region.maxX && op.point.y >= region.minY && op.point.y <= region.maxY,
  )
  if (matches.length === 0) return

  return matches.reduce((smallest, current) => {
    const smallestArea = (smallest.maxX - smallest.minX) * (smallest.maxY - smallest.minY)
    const currentArea = (current.maxX - current.minX) * (current.maxY - current.minY)
    return currentArea < smallestArea ? current : smallest
  })
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

function getInnerBounds(
  container: TextRegionBoundsWithSemantic,
  metrics: ReturnType<typeof measureAsciiText>,
): InnerBounds | null {
  const innerMinCol = container.leftBorderCol + 1
  const reservedRightCols = container.semantic?.frame?.kind === 'note' ? 2 : 0
  const innerMaxCol = container.rightBorderCol - metrics.textWidthCells - reservedRightCols
  const innerMinRow = container.topBorderRow + 1
  const innerMaxRow = container.bottomBorderRow - metrics.textHeightRows

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
  preferUp?: boolean
}): number {
  const { row, col, metrics, bounds, separators, preferUp = false } = params
  if (!isTextOnSeparatorRow({ row, col, metrics, separators })) {
    return row
  }

  const maxShift = Math.max(row - bounds.minRow, bounds.maxRow - row)
  for (let delta = 1; delta <= maxShift; delta++) {
    const directions = preferUp ? [-delta, delta] : [delta, -delta]
    for (const direction of directions) {
      const candidate = row + direction
      if (candidate < bounds.minRow || candidate > bounds.maxRow) continue
      if (!isTextOnSeparatorRow({ row: candidate, col, metrics, separators })) {
        return candidate
      }
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

function normalizeRect(op: RectOp, options: NormalizeOptions, sharedBorders: SharedContainerBorders): RectOp {
  if (op.semantic?.role !== 'container') return op

  const xs = op.points.map(point => point.x)
  const ys = op.points.map(point => point.y)
  const rawMinX = Math.min(...xs)
  const rawMaxX = Math.max(...xs)
  const rawMinY = Math.min(...ys)
  const rawMaxY = Math.max(...ys)

  const minXKey = makeBorderKey(rawMinX)
  const maxXKey = makeBorderKey(rawMaxX)
  const minYKey = makeBorderKey(rawMinY)
  const maxYKey = makeBorderKey(rawMaxY)

  const minX = sharedBorders.minXWithMatchingMax.has(minXKey)
    ? Math.round(rawMinX / options.cellWidth) * options.cellWidth
    : Math.floor(rawMinX / options.cellWidth) * options.cellWidth
  const maxX = sharedBorders.maxXWithMatchingMin.has(maxXKey)
    ? Math.round(rawMaxX / options.cellWidth) * options.cellWidth
    : Math.ceil(rawMaxX / options.cellWidth) * options.cellWidth
  const minY = sharedBorders.minYWithMatchingMax.has(minYKey)
    ? Math.round(rawMinY / options.cellHeight) * options.cellHeight
    : Math.floor(rawMinY / options.cellHeight) * options.cellHeight
  const maxY = sharedBorders.maxYWithMatchingMin.has(maxYKey)
    ? Math.round(rawMaxY / options.cellHeight) * options.cellHeight
    : Math.ceil(rawMaxY / options.cellHeight) * options.cellHeight

  return {
    ...op,
    points: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
  }
}

function normalizeText(
  op: TextOp,
  options: NormalizeOptions,
  textRegions: TextRegionBounds[],
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
  const repairs = op.repairs ? [...op.repairs] : undefined

  const textRegion = findTextRegionForText(op, textRegions)
  if (textRegion) {
    const innerBounds = getInnerBounds(textRegion, metrics)
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
        preferUp: op.textBaseline === 'middle',
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
    repairs,
  }
}

function normalizeConnector(
  op: ConnectorOp,
  options: NormalizeOptions,
  textRegions: TextRegionBoundsWithSemantic[],
): ConnectorOp {
  const endpointClearance = op.semantic.connector.compactEndpointClearance

  if (!op.semantic.connector.compact || op.points.length < 2) {
    return op
  }

  const points = [...op.points]
  const lastIndex = points.length - 1
  const start = pointToGrid(points[0], options)
  const end = pointToGrid(points[lastIndex], options)

  if (start.col === end.col && axisIncludes(endpointClearance, 'vertical')) {
    const sourceRegion = findContainingContainerRegion(start, textRegions)
    const endTouch = findContainerBorderTouch(end, textRegions)
    const targetRegion =
      (endTouch?.edge === 'top' ? endTouch : undefined) ||
      findNearestContainerBelow(end, textRegions) ||
      findContainingContainerRegion(end, textRegions)

    if (!sourceRegion || !targetRegion || end.row < start.row) {
      return op
    }

    if (sourceRegion) {
      points[0] = {
        ...points[0],
        y: (sourceRegion.bottomBorderRow + 1) * options.cellHeight,
      }
    }

    if (targetRegion) {
      points[lastIndex] = {
        ...points[lastIndex],
        y: (targetRegion.topBorderRow - 1) * options.cellHeight,
      }
    }

    return {
      ...op,
      points,
    }
  }

  if (start.row === end.row && axisIncludes(endpointClearance, 'horizontal')) {
    const sourceRegion = findContainingContainerRegion(start, textRegions)
    const endTouch = findContainerBorderTouch(end, textRegions)

    if (!sourceRegion) {
      return op
    }

    if (end.col >= start.col) {
      const targetRegion =
        (endTouch?.edge === 'left' ? endTouch : undefined) ||
        findNearestContainerRight(end, textRegions) ||
        findContainingContainerRegion(end, textRegions)

      if (!targetRegion) {
        return op
      }

      points[0] = {
        ...points[0],
        x: (sourceRegion.rightBorderCol + 1) * options.cellWidth,
      }
      points[lastIndex] = {
        ...points[lastIndex],
        x: (targetRegion.leftBorderCol - 1) * options.cellWidth,
      }
    } else {
      const targetRegion =
        (endTouch?.edge === 'right' ? endTouch : undefined) ||
        findNearestContainerLeft(end, textRegions) ||
        findContainingContainerRegion(end, textRegions)

      if (!targetRegion) {
        return op
      }

      points[0] = {
        ...points[0],
        x: (sourceRegion.leftBorderCol - 1) * options.cellWidth,
      }
      points[lastIndex] = {
        ...points[lastIndex],
        x: (targetRegion.rightBorderCol + 1) * options.cellWidth,
      }
    }

    return {
      ...op,
      points,
    }
  }

  return op
}

export function normalizeDrawOps(ops: DrawOp[], options: NormalizeOptions): DrawOp[] {
  const sharedBorders = collectSharedContainerBorders(ops)
  const rawContainers = collectRawContainers(ops)
  const rawRects = collectRawVisibleRects(ops)
  const snappedShapes = ops.map(op => {
    if (op.kind === 'segment') return normalizeSegment(op, options)
    if (op.kind === 'rect') return normalizeRect(op, options, sharedBorders)
    return op
  })
  const nestedSafeShapes = preventNestedContainerBorderCollapse(snappedShapes, rawContainers, options)
  const normalizedShapes = preventVisibleRectBorderOverlap(nestedSafeShapes, rawRects, options)
  const gapReservedShapes = reserveCompactConnectorGaps(normalizedShapes, options)
  const textRegions = collectTextRegions(gapReservedShapes, options)
  const separators = collectHorizontalSeparators(normalizedShapes, options)

  return gapReservedShapes.map(op => {
    if (op.kind === 'connector') return normalizeConnector(op, options, textRegions)
    if (op.kind === 'text') return normalizeText(op, options, textRegions, separators)
    return op
  })
}
