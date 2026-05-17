import type { TextDiagramLineOp } from '@pintora/core'
import { LineType, Relationship } from '../db'
import type { ComponentAsciiNodeBox, ComponentAsciiPoint } from './types'

export function roundPoint(point: ComponentAsciiPoint): ComponentAsciiPoint {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  }
}

export function manhattanize(points: ComponentAsciiPoint[]) {
  if (points.length <= 1) return points
  const route: ComponentAsciiPoint[] = [points[0]]
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

function snapSourceEndpoint(box: ComponentAsciiNodeBox, point: ComponentAsciiPoint, next: ComponentAsciiPoint) {
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

function snapTargetEndpoint(box: ComponentAsciiNodeBox, previous: ComponentAsciiPoint, point: ComponentAsciiPoint) {
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

export function snapRouteEndpoints(
  route: ComponentAsciiPoint[],
  source?: ComponentAsciiNodeBox,
  target?: ComponentAsciiNodeBox,
) {
  if (route.length < 2) return route
  const snapped = route.slice()
  if (source) snapped[0] = snapSourceEndpoint(source, snapped[0], snapped[1])
  if (target)
    snapped[snapped.length - 1] = snapTargetEndpoint(target, snapped[snapped.length - 2], snapped[snapped.length - 1])
  return manhattanize(snapped)
}

export function routeSkippedRelationship(
  relationship: Relationship,
  source: ComponentAsciiNodeBox,
  target: ComponentAsciiNodeBox,
) {
  const isToGroup = relationship.to.type === 'group'
  const isFromGroup = relationship.from.type === 'group'
  let start: ComponentAsciiPoint
  let end: ComponentAsciiPoint

  if (isToGroup) {
    start = { x: source.centerX, y: source.top - 1 }
    end = { x: target.centerX, y: target.top + 1 }
  } else if (isFromGroup) {
    start = { x: source.centerX, y: source.top + 1 }
    end = { x: target.centerX, y: target.top - 1 }
  } else {
    start = { x: source.centerX, y: source.centerY }
    end = { x: target.centerX, y: target.centerY }
  }

  if (start.x === end.x || start.y === end.y) return [start, end]
  const midY = Math.floor((start.y + end.y) / 2)
  return manhattanize([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end])
}

export function lineStroke(lineType: LineType): TextDiagramLineOp['stroke'] {
  return lineType === LineType.DOTTED || lineType === LineType.DOTTED_ARROW ? 'dashed' : 'solid'
}

export function arrowHeads(lineType: LineType, isReversed?: boolean) {
  const hasArrow = lineType === LineType.SOLID_ARROW || lineType === LineType.DOTTED_ARROW
  if (!hasArrow) return {}
  return isReversed ? { startHead: 'filled' as const } : { endHead: 'filled' as const }
}
