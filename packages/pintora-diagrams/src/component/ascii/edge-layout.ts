import type { TextDiagramLineOp } from '@pintora/core'
import { manhattanize, roundPoint, snapRouteEndpoints } from '../../util/text-diagram'
import { LineType, Relationship } from '../db'
import type { ComponentAsciiNodeBox, ComponentAsciiPoint } from './types'

export { manhattanize, roundPoint, snapRouteEndpoints }

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
