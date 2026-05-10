import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { buildEntityBoxes } from './entity-layout'
import { placeRankedEntities, rankEntities } from './rank-layout'
import { attachRelationships, cardinalityMarker, relationshipStroke } from './relationship-layout'
import { lineOp, rectOp, textOp } from './text'
import type { ErAsciiEntityBox, ErAsciiLayout } from './types'
import type { ErDiagramIR } from '../db'

export type ErTextDiagramPlanOptions = {
  layoutDirection?: string
  useMaxWidth?: boolean
  containerWidth?: number
}

function pushEntity(ops: TextDiagramOp[], entity: ErAsciiEntityBox) {
  ops.push(rectOp(entity.left, entity.top, entity.width, entity.height))
  ops.push(textOp(entity.centerX, entity.top + 1, entity.id, 'center'))
  if (entity.attributes.length) {
    ops.push(lineOp({ x: entity.left + 1, y: entity.top + 2 }, { x: entity.right - 1, y: entity.top + 2 }))
    entity.attributes.forEach((attribute, index) => {
      ops.push(textOp(entity.left + 2, entity.top + 3 + index, attribute.text))
    })
  }
}

function pushRoute(ops: TextDiagramOp[], route: { x: number; y: number }[], stroke: 'solid' | 'dashed') {
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1]
    const to = route[i]
    if (from.x === to.x && from.y === to.y) continue
    if (from.x === to.x || from.y === to.y) ops.push(lineOp(from, to, { stroke }))
  }
}

type EndpointSide = 'left' | 'right' | 'upper' | 'lower'

function startEndpointSide(point: { x: number; y: number }, next: { x: number; y: number }): EndpointSide {
  if (next.x > point.x) return 'left'
  if (next.x < point.x) return 'right'
  if (next.y > point.y) return 'upper'
  return 'lower'
}

function endEndpointSide(point: { x: number; y: number }, previous: { x: number; y: number }): EndpointSide {
  if (previous.x < point.x) return 'right'
  if (previous.x > point.x) return 'left'
  if (previous.y < point.y) return 'lower'
  return 'upper'
}

function markerTextX(point: { x: number; y: number }, marker: string, side: EndpointSide) {
  const markerWidth = Array.from(marker).length
  if (side === 'left') return point.x
  if (side === 'right') return point.x - markerWidth + 1
  return point.x - Math.floor(markerWidth / 2)
}

function buildLayout(ir: ErDiagramIR): ErAsciiLayout {
  const base = placeRankedEntities(rankEntities(ir, buildEntityBoxes(ir)), { title: ir.title })
  return attachRelationships(ir, base)
}

export function erLayoutToTextDiagramPlan(layout: ErAsciiLayout): TextDiagramPlan {
  const ops: TextDiagramOp[] = []

  if (layout.title) ops.push(textOp(Math.floor(layout.width / 2), 0, layout.title, 'center'))
  layout.relationships.forEach(edge => {
    pushRoute(ops, edge.route, relationshipStroke(edge.identification))
    const start = edge.route[0]
    const end = edge.route[edge.route.length - 1]
    const startSide = startEndpointSide(start, edge.route[1])
    const endSide = endEndpointSide(end, edge.route[edge.route.length - 2])
    const startMarker = cardinalityMarker(edge.cardAtSource, startSide)
    const endMarker = cardinalityMarker(edge.cardAtTarget, endSide)
    ops.push(textOp(markerTextX(start, startMarker, startSide), start.y, startMarker))
    ops.push(textOp(markerTextX(end, endMarker, endSide), end.y, endMarker))
    if (edge.label) ops.push(textOp(edge.labelPoint.x, edge.labelPoint.y, edge.label, 'center'))
  })
  layout.inheritances.forEach(edge => {
    pushRoute(ops, edge.route, 'solid')
    const end = edge.route[edge.route.length - 1]
    const head = edge.route[0].y > end.y ? '△' : '▽'
    ops.push(textOp(end.x, end.y, head, 'center'))
    ops.push(textOp(edge.labelPoint.x, edge.labelPoint.y, 'ISA', 'center'))
  })
  layout.entities.forEach(entity => pushEntity(ops, entity))

  return {
    width: Math.max(1, layout.width),
    height: Math.max(1, layout.height),
    ops,
  }
}

export function toErTextDiagramPlan(ir: ErDiagramIR, _options: ErTextDiagramPlanOptions = {}): TextDiagramPlan {
  void _options
  return erLayoutToTextDiagramPlan(buildLayout(ir))
}
