import { Cardinality, Identification, type ErDiagramIR } from '../db'
import type { ErAsciiEntityBox, ErAsciiInheritanceEdge, ErAsciiLayout, ErAsciiRelationshipEdge } from './types'

export type CardinalityEndpointSide = 'left' | 'right' | 'upper' | 'lower'

function marker(cardinality: Cardinality, side: CardinalityEndpointSide) {
  const isRight = side === 'right' || side === 'lower'

  switch (cardinality) {
    case Cardinality.ZERO_OR_ONE:
      return '○│'
    case Cardinality.ZERO_OR_MORE:
      return isRight ? '○╟' : '╢○'
    case Cardinality.ONE_OR_MORE:
      return isRight ? '╟' : '╢'
    case Cardinality.ONLY_ONE:
      return '│'
    case Cardinality.MORE:
      return isRight ? '╟' : '╢'
  }
}

function routeBetween(source: ErAsciiEntityBox, target: ErAsciiEntityBox, index: number) {
  if (source.bottom < target.top) {
    const laneY = source.bottom + 2 + index
    return [
      { x: source.centerX, y: source.bottom + 1 },
      { x: source.centerX, y: laneY },
      { x: target.centerX, y: laneY },
      { x: target.centerX, y: target.top - 1 },
    ]
  }

  if (target.bottom < source.top) {
    const laneY = target.bottom + 2 + index
    return [
      { x: source.centerX, y: source.top - 1 },
      { x: source.centerX, y: laneY },
      { x: target.centerX, y: laneY },
      { x: target.centerX, y: target.bottom + 1 },
    ]
  }

  const sourceLeftOfTarget = source.right < target.left
  const laneY = Math.max(source.bottom, target.bottom) + 1 + index
  return sourceLeftOfTarget
    ? [
        { x: source.right + 1, y: source.centerY },
        { x: source.right + 3, y: source.centerY },
        { x: source.right + 3, y: laneY },
        { x: target.left - 3, y: laneY },
        { x: target.left - 3, y: target.centerY },
        { x: target.left - 1, y: target.centerY },
      ]
    : [
        { x: source.left - 1, y: source.centerY },
        { x: source.left - 3, y: source.centerY },
        { x: source.left - 3, y: laneY },
        { x: target.right + 3, y: laneY },
        { x: target.right + 3, y: target.centerY },
        { x: target.right + 1, y: target.centerY },
      ]
}

function midpoint(points: { x: number; y: number }[]) {
  const mid = points[Math.floor(points.length / 2)]
  return { x: mid.x, y: mid.y }
}

export function attachRelationships(
  ir: ErDiagramIR,
  base: Pick<ErAsciiLayout, 'width' | 'height' | 'title' | 'entities'>,
): ErAsciiLayout {
  const entitiesById = new Map(base.entities.map(entity => [entity.id, entity]))
  const relationships: ErAsciiRelationshipEdge[] = []
  const inheritances: ErAsciiInheritanceEdge[] = []

  ir.relationships.forEach((rel, index) => {
    const source = entitiesById.get(rel.entityA)
    const target = entitiesById.get(rel.entityB)
    if (!source || !target) return
    const route = routeBetween(source, target, index % 3)
    relationships.push({
      kind: 'relationship',
      sourceId: rel.entityA,
      targetId: rel.entityB,
      label: rel.roleA,
      cardAtSource: rel.relSpec.cardB,
      cardAtTarget: rel.relSpec.cardA,
      identification: rel.relSpec.relType,
      route,
      labelPoint: midpoint(route),
    })
  })

  ir.inheritances.forEach((inh, index) => {
    const sup = entitiesById.get(inh.sup)
    const sub = entitiesById.get(inh.sub)
    if (!sup || !sub) return
    const route = routeBetween(sub, sup, index % 3)
    inheritances.push({
      kind: 'inheritance',
      superId: inh.sup,
      subId: inh.sub,
      route,
      labelPoint: midpoint(route),
      headPoint: route[route.length - 1],
    })
  })

  return {
    ...base,
    width: Math.max(base.width, ...base.entities.map(entity => entity.right + 1)),
    height:
      Math.max(base.height, ...base.entities.map(entity => entity.bottom + 1)) + Math.min(3, relationships.length),
    relationships,
    inheritances,
  }
}

export function cardinalityMarker(cardinality: Cardinality, side: CardinalityEndpointSide) {
  return marker(cardinality, side)
}

export function relationshipStroke(identification: Identification) {
  return identification === Identification.NON_IDENTIFYING ? 'dashed' : 'solid'
}
