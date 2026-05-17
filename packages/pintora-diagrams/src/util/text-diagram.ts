export type TextDiagramPoint = { x: number; y: number }
type TextDiagramOp = import('@pintora/core').TextDiagramOp
type TextDiagramLineOp = import('@pintora/core').TextDiagramLineOp

export type TextDiagramBox = {
  left: number
  top: number
  right: number
  bottom: number
}

export function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function textOp(x: number, y: number, text: string, align?: 'left' | 'center' | 'right'): TextDiagramOp {
  return align ? { type: 'text', x, y, text, align } : { type: 'text', x, y, text }
}

export function lineOp(
  from: TextDiagramPoint,
  to: TextDiagramPoint,
  extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
): TextDiagramOp {
  return { type: 'line', from, to, ...extra }
}

export function rectOp(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke?: 'solid' | 'dashed',
): TextDiagramOp {
  return stroke ? { type: 'rect', x, y, width, height, stroke } : { type: 'rect', x, y, width, height }
}

export function fillOp(x: number, y: number, width: number, height: number, char: string): TextDiagramOp {
  return { type: 'fill', x, y, width, height, char }
}

export function alignedTextLeft(x: number, text: string, align?: 'left' | 'center' | 'right') {
  if (align === 'center') return x - Math.floor(widthOf(text) / 2)
  if (align === 'right') return x - widthOf(text) + 1
  return x
}

export function measureTextDiagramOps(ops: TextDiagramOp[], fallbackWidth = 1) {
  let width = fallbackWidth
  let height = 1
  ops.forEach(op => {
    if (op.type === 'text') {
      const left = alignedTextLeft(op.x, op.text, op.align)
      width = Math.max(width, left + widthOf(op.text))
      height = Math.max(height, op.y + 1)
    } else if (op.type === 'rect' || op.type === 'fill') {
      width = Math.max(width, op.x + op.width)
      height = Math.max(height, op.y + op.height)
    } else {
      width = Math.max(width, op.from.x + 1, op.to.x + 1)
      height = Math.max(height, op.from.y + 1, op.to.y + 1)
    }
  })
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

export function roundPoint(point: TextDiagramPoint): TextDiagramPoint {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  }
}

export function midpoint(points: TextDiagramPoint[]) {
  if (!points.length) return { x: 0, y: 0 }
  const middle = Math.floor(points.length / 2)
  if (points.length % 2 === 1) return points[middle]
  const previous = points[middle - 1]
  const next = points[middle]
  return {
    x: Math.round((previous.x + next.x) / 2),
    y: Math.round((previous.y + next.y) / 2),
  }
}

export function manhattanize(points: TextDiagramPoint[]) {
  if (points.length <= 1) return points
  const route: TextDiagramPoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const previous = route[route.length - 1]
    const next = points[i]
    if (previous.x !== next.x && previous.y !== next.y) {
      route.push({ x: previous.x, y: next.y })
    }
    route.push(next)
  }
  return route.filter((point, index) => {
    const previous = route[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num))
}

function snapSourceEndpoint(box: TextDiagramBox, point: TextDiagramPoint, next: TextDiagramPoint): TextDiagramPoint {
  const dx = next.x - point.x
  const dy = next.y - point.y
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      x: dx > 0 ? box.right + 1 : box.left - 1,
      y: clamp(point.y, box.top + 1, box.bottom - 1),
    }
  }
  return {
    x: clamp(point.x, box.left + 1, box.right - 1),
    y: dy > 0 ? box.bottom + 1 : box.top - 1,
  }
}

function snapTargetEndpoint(
  box: TextDiagramBox,
  previous: TextDiagramPoint,
  point: TextDiagramPoint,
): TextDiagramPoint {
  const dx = point.x - previous.x
  const dy = point.y - previous.y
  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      x: dx > 0 ? box.left - 1 : box.right + 1,
      y: clamp(point.y, box.top + 1, box.bottom - 1),
    }
  }
  return {
    x: clamp(point.x, box.left + 1, box.right - 1),
    y: dy > 0 ? box.top - 1 : box.bottom + 1,
  }
}

export function snapRouteEndpoints(route: TextDiagramPoint[], source?: TextDiagramBox, target?: TextDiagramBox) {
  if (route.length < 2) return route
  const snapped = route.slice()
  if (source) snapped[0] = snapSourceEndpoint(source, snapped[0], snapped[1])
  if (target) {
    snapped[snapped.length - 1] = snapTargetEndpoint(target, snapped[snapped.length - 2], snapped[snapped.length - 1])
  }
  return manhattanize(snapped)
}

export function drawRoute(
  route: TextDiagramPoint[],
  extra: Pick<TextDiagramLineOp, 'stroke' | 'startHead' | 'endHead'> = {},
) {
  const segments: Array<{ from: TextDiagramPoint; to: TextDiagramPoint }> = []
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1]
    const to = route[i]
    if (from.x === to.x && from.y === to.y) continue
    if (from.x === to.x || from.y === to.y) segments.push({ from, to })
  }

  return segments.map((segment, index) => {
    const segmentExtra = {
      ...(extra.stroke ? { stroke: extra.stroke } : {}),
      ...(index === 0 && extra.startHead ? { startHead: extra.startHead } : {}),
      ...(index === segments.length - 1 && extra.endHead ? { endHead: extra.endHead } : {}),
    }
    return lineOp(segment.from, segment.to, segmentExtra)
  })
}

export function translateTextDiagramOps(ops: TextDiagramOp[], dx: number, dy: number): TextDiagramOp[] {
  return ops.map(op => {
    if (op.type === 'text') return { ...op, x: op.x + dx, y: op.y + dy }
    if (op.type === 'rect' || op.type === 'fill') return { ...op, x: op.x + dx, y: op.y + dy }
    return {
      ...op,
      from: { x: op.from.x + dx, y: op.from.y + dy },
      to: { x: op.to.x + dx, y: op.to.y + dy },
    }
  })
}
