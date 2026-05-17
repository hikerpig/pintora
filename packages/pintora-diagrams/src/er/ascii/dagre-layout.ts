import { createLayoutGraph, type LayoutEdge, type LayoutGraph, type LayoutNode } from '../../util/graph'
import { DagreWrapper } from '../../util/dagre-wrapper'
import { manhattanize, roundPoint, snapRouteEndpoints } from '../../util/text-diagram'
import type { Relationship, ErDiagramIR } from '../db'
import { buildEntityBoxes } from './entity-layout'
import type {
  ErAsciiEntityBox,
  ErAsciiInheritanceEdge,
  ErAsciiLayout,
  ErAsciiPoint,
  ErAsciiRelationshipEdge,
} from './types'
import { widthOf } from './text'

const TITLE_ROWS = 2
const ASCII_NODESEP = 6
const ASCII_RANKSEP = 5
const ASCII_EDGESEP = 2
const ISA_LABEL = 'ISA'

type ErAsciiDagreLayoutOptions = {
  layoutDirection?: string
}

type RelationshipEdgeData = {
  kind: 'relationship'
  relationship: Relationship
}

type InheritanceEdgeData = {
  kind: 'inheritance'
  superId: string
  subId: string
}

type ErAsciiDagreEdgeData = LayoutEdge<RelationshipEdgeData | InheritanceEdgeData>

function normalizeLayoutDirection(layoutDirection?: string) {
  return layoutDirection === 'LR' || layoutDirection === 'RL' || layoutDirection === 'BT' ? layoutDirection : 'TB'
}

function inheritanceLabelId(superId: string, subId: string) {
  return `inherit:${subId}->${superId}`
}

function setEntityNodes(g: LayoutGraph, boxes: ErAsciiEntityBox[]) {
  boxes.forEach(box => {
    g.setNode(box.id, {
      id: box.id,
      width: box.width,
      height: box.height,
    })
  })
}

function setRelationshipEdges(g: LayoutGraph, relationships: ErDiagramIR['relationships']) {
  relationships.forEach(rel => {
    g.setEdge(rel.entityA, rel.entityB, {
      kind: 'relationship',
      relationship: rel,
      width: Math.max(1, widthOf(rel.roleA)),
      height: 1,
    })
  })
}

function setInheritanceEdges(g: LayoutGraph, inheritances: ErDiagramIR['inheritances']) {
  inheritances.forEach(inh => {
    const labelId = inheritanceLabelId(inh.sup, inh.sub)
    g.setNode(labelId, {
      id: labelId,
      width: widthOf(ISA_LABEL),
      height: 1,
      isDummy: true,
    })
    g.setEdge(inh.sub, labelId, {
      kind: 'inheritance',
      superId: inh.sup,
      subId: inh.sub,
    })
    g.setEdge(labelId, inh.sup, {
      kind: 'inheritance',
      superId: inh.sup,
      subId: inh.sub,
    })
  })
}

function edgePoints(edge: ErAsciiDagreEdgeData): ErAsciiPoint[] {
  return (edge.points || []).map(point => roundPoint(point))
}

function routeLabelPoint(points: ErAsciiPoint[]) {
  return points[Math.floor(points.length / 2)] || { x: 0, y: 0 }
}

function collectBounds(g: LayoutGraph) {
  const points: ErAsciiPoint[] = []

  g.nodes().forEach(id => {
    const node = g.node(id) as LayoutNode | undefined
    if (!node) return
    points.push(
      { x: node.x - node.width / 2, y: node.y - node.height / 2 },
      { x: node.x + node.width / 2, y: node.y + node.height / 2 },
    )
  })

  g.edges().forEach(edgeObj => {
    const edge = g.edge(edgeObj) as ErAsciiDagreEdgeData | undefined
    edge?.points?.forEach(point => points.push(point))
  })

  const minX = Math.floor(Math.min(0, ...points.map(point => point.x)))
  const minY = Math.floor(Math.min(0, ...points.map(point => point.y)))

  return { minX, minY }
}

function shiftPoint(point: ErAsciiPoint, bounds: { minX: number; minY: number }, titleOffset: number): ErAsciiPoint {
  return {
    x: Math.max(0, Math.round(point.x - bounds.minX)),
    y: Math.max(0, Math.round(point.y - bounds.minY) + titleOffset),
  }
}

function placeEntityBox(
  box: ErAsciiEntityBox,
  node: LayoutNode,
  bounds: { minX: number; minY: number },
  titleOffset: number,
): ErAsciiEntityBox {
  const left = Math.max(0, Math.round(node.x - node.width / 2 - bounds.minX))
  const top = Math.max(0, Math.round(node.y - node.height / 2 - bounds.minY) + titleOffset)
  return {
    ...box,
    x: left,
    y: top,
    left,
    top,
    right: left + box.width - 1,
    bottom: top + box.height - 1,
    centerX: left + Math.floor(box.width / 2),
    centerY: top + Math.floor(box.height / 2),
  }
}

function buildRelationshipEdges(
  g: LayoutGraph,
  entitiesById: Map<string, ErAsciiEntityBox>,
  bounds: { minX: number; minY: number },
  titleOffset: number,
) {
  const relationships: ErAsciiRelationshipEdge[] = []
  g.edges().forEach(edgeObj => {
    const edge = g.edge(edgeObj) as ErAsciiDagreEdgeData | undefined
    if (!edge || edge.kind !== 'relationship') return
    const rel = edge.relationship
    const source = entitiesById.get(rel.entityA)
    const target = entitiesById.get(rel.entityB)
    const rawRoute = manhattanize(edgePoints(edge).map(point => shiftPoint(point, bounds, titleOffset)))
    const route = snapRouteEndpoints(rawRoute, source, target)
    const labelPoint = edge.labelPoint
      ? shiftPoint(roundPoint(edge.labelPoint), bounds, titleOffset)
      : routeLabelPoint(route)
    relationships.push({
      kind: 'relationship',
      sourceId: rel.entityA,
      targetId: rel.entityB,
      label: rel.roleA,
      cardAtSource: rel.relSpec.cardB,
      cardAtTarget: rel.relSpec.cardA,
      identification: rel.relSpec.relType,
      route,
      labelPoint,
    })
  })
  return relationships
}

function buildInheritanceEdges(
  g: LayoutGraph,
  ir: ErDiagramIR,
  entitiesById: Map<string, ErAsciiEntityBox>,
  bounds: { minX: number; minY: number },
  titleOffset: number,
) {
  const inheritances: ErAsciiInheritanceEdge[] = []
  ir.inheritances.forEach(inh => {
    const labelId = inheritanceLabelId(inh.sup, inh.sub)
    const labelNode = g.node(labelId) as LayoutNode | undefined
    const first = g.edge(inh.sub, labelId) as ErAsciiDagreEdgeData | undefined
    const second = g.edge(labelId, inh.sup) as ErAsciiDagreEdgeData | undefined
    if (!labelNode || !first || !second) return

    const rawRoute = manhattanize(
      [...edgePoints(first), ...edgePoints(second)].map(point => shiftPoint(point, bounds, titleOffset)),
    )
    const route = snapRouteEndpoints(rawRoute, entitiesById.get(inh.sub), entitiesById.get(inh.sup))
    const labelPoint = shiftPoint(roundPoint({ x: labelNode.x, y: labelNode.y }), bounds, titleOffset)
    inheritances.push({
      kind: 'inheritance',
      superId: inh.sup,
      subId: inh.sub,
      route,
      labelPoint,
      headPoint: route[route.length - 1],
    })
  })
  return inheritances
}

function layoutSize(layout: Pick<ErAsciiLayout, 'entities' | 'relationships' | 'inheritances'>, title?: string) {
  const points: ErAsciiPoint[] = []
  layout.entities.forEach(entity => {
    points.push({ x: entity.right + 1, y: entity.bottom + 1 })
  })
  layout.relationships.forEach(edge => {
    points.push(edge.labelPoint, ...edge.route)
  })
  layout.inheritances.forEach(edge => {
    points.push(edge.labelPoint, ...edge.route)
  })

  return {
    width: Math.max(1, title?.length || 0, ...points.map(point => point.x + 1)),
    height: Math.max(1, ...points.map(point => point.y + 1)),
  }
}

export function buildDagreErAsciiLayout(ir: ErDiagramIR, options: ErAsciiDagreLayoutOptions = {}): ErAsciiLayout {
  const boxes = buildEntityBoxes(ir)
  const g = createLayoutGraph({
    multigraph: true,
    directed: true,
    compound: false,
  })
    .setGraph({
      rankdir: normalizeLayoutDirection(options.layoutDirection),
      nodesep: ASCII_NODESEP,
      ranksep: ASCII_RANKSEP,
      edgesep: ASCII_EDGESEP,
      splines: 'ortho',
    })
    .setDefaultEdgeLabel(() => ({}))

  setEntityNodes(g, boxes)
  setRelationshipEdges(g, ir.relationships)
  setInheritanceEdges(g, ir.inheritances)

  new DagreWrapper(g).doLayout()

  const titleOffset = ir.title ? TITLE_ROWS : 0
  const bounds = collectBounds(g)
  const boxesById = new Map(boxes.map(box => [box.id, box]))
  const entities = boxes
    .map(box => {
      const node = g.node(box.id) as LayoutNode
      return placeEntityBox(boxesById.get(box.id)!, node, bounds, titleOffset)
    })
    .sort((a, b) => a.top - b.top || a.left - b.left || a.order - b.order)
  const entitiesById = new Map(entities.map(entity => [entity.id, entity]))
  const relationships = buildRelationshipEdges(g, entitiesById, bounds, titleOffset)
  const inheritances = buildInheritanceEdges(g, ir, entitiesById, bounds, titleOffset)
  const size = layoutSize({ entities, relationships, inheritances }, ir.title)

  return {
    title: ir.title,
    width: size.width,
    height: size.height,
    entities,
    relationships,
    inheritances,
  }
}
