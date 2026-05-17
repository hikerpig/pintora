import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { DagreWrapper } from '../../util/dagre-wrapper'
import type { LayoutEdge, LayoutGraph, LayoutNode } from '../../util/graph'
import { lineOp, rectOp, textOp, widthOf } from '../../util/text-diagram'
import type { ComponentConf } from '../config'
import { type ComponentDiagramIR, type Relationship } from '../db'
import { buildComponentLayoutGraph } from '../layout/graph-builder'
import type { ComponentLayoutAdapter } from '../layout/types'
import {
  arrowHeads,
  lineStroke,
  manhattanize,
  roundPoint,
  routeSkippedRelationship,
  snapRouteEndpoints,
} from './edge-layout'
import type { ComponentAsciiLayout, ComponentAsciiNodeBox, ComponentAsciiPoint } from './types'

const TITLE_ROWS = 2
const ASCII_NODESEP = 2
const ASCII_RANKSEP = 2
const ASCII_EDGESEP = 2
const ASCII_SKIPPED_EDGE_MARGIN = 2
const ASCII_MAX_SKIPPED_EDGE_MARGIN = 4
const ASCII_VERTICAL_GAP = 2
const COMPONENT_MIN_WIDTH = 8
const GROUP_MIN_WIDTH = 10

type ComponentAsciiEdgeData = LayoutEdge<{
  relationship?: Relationship
  isDummyEdge?: boolean
}>

function labelLines(label: string) {
  return label
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function nodeLabel(ir: ComponentDiagramIR, id: string) {
  const component = ir.components[id]
  if (component) return component.label || component.name
  const interf = ir.interfaces[id]
  if (interf) return interf.label || interf.name
  const group = ir.groups[id]
  if (group) return group.label || group.name
  return id
}

function nodeKind(ir: ComponentDiagramIR, id: string): ComponentAsciiNodeBox['kind'] | undefined {
  if (ir.components[id]) return 'component'
  if (ir.interfaces[id]) return 'interface'
  if (ir.groups[id]) return 'group'
}

function elementParent(ir: ComponentDiagramIR, id: string) {
  return ir.components[id]?.parent || ir.interfaces[id]?.parent || ir.groups[id]?.parent
}

function isInsideGroup(ir: ComponentDiagramIR, id: string, groupId: string) {
  let parent = elementParent(ir, id)
  while (parent) {
    if (parent === groupId) return true
    parent = ir.groups[parent]?.parent
  }
  return false
}

function isChildToExternalGroupRelationship(ir: ComponentDiagramIR, relationship: Relationship) {
  const sourceParent = elementParent(ir, relationship.from.name)
  const targetParent = elementParent(ir, relationship.to.name)
  return Boolean(sourceParent && !targetParent && !isInsideGroup(ir, relationship.to.name, sourceParent))
}

function createAsciiLayoutAdapter(conf: ComponentConf): ComponentLayoutAdapter {
  return {
    measureComponent(component) {
      const lines = labelLines(component.label || component.name)
      const contentWidth = Math.max(...lines.map(widthOf), 1)
      return {
        width: Math.max(contentWidth + 4, COMPONENT_MIN_WIDTH),
        height: Math.max(lines.length + 2, 3),
      }
    },

    measureInterface(interf) {
      const label = (interf.label || interf.name).replace(/\n/g, ' ')
      return {
        width: Math.max(widthOf(label), 3),
        height: 2,
        outerWidth: Math.max(widthOf(label), 3),
      }
    },

    measureGroup(group) {
      const label = group.label || group.name
      const typeLabel = `[${group.groupType}]`
      return {
        width: Math.max(widthOf(label) + 4, GROUP_MIN_WIDTH),
        height: conf.hideGroupType ? 3 : 4,
        marginb: 1,
        minwidth: Math.max(widthOf(label), conf.hideGroupType ? 0 : widthOf(typeLabel)) + 4,
      }
    },

    makeRelationshipEdge(relationship) {
      return {
        width: relationship.message ? Math.max(widthOf(relationship.message), 1) : 1,
        height: relationship.message ? 1 : 0,
      }
    },
  }
}

function rawNodeBox(ir: ComponentDiagramIR, id: string, node: LayoutNode): ComponentAsciiNodeBox | undefined {
  const kind = nodeKind(ir, id)
  if (!kind) return
  const width = Math.max(1, Math.round(node.width || 1))
  const height = Math.max(1, Math.round(node.height || 1))
  const left = Math.round(node.x - width / 2)
  const top = Math.round(node.y - height / 2)
  const group = ir.groups[id]
  return {
    id,
    kind,
    label: nodeLabel(ir, id),
    groupType: group?.groupType,
    width,
    height,
    left,
    top,
    right: left + width - 1,
    bottom: top + height - 1,
    centerX: left + Math.floor(width / 2),
    centerY: top + Math.floor(height / 2),
  }
}

function edgePoints(edge: ComponentAsciiEdgeData, source?: ComponentAsciiNodeBox, target?: ComponentAsciiNodeBox) {
  if (edge.points?.length) return edge.points.map(point => roundPoint(point))
  if (source && target)
    return [
      { x: source.centerX, y: source.centerY },
      { x: target.centerX, y: target.centerY },
    ]
  return []
}

function midpoint(points: ComponentAsciiPoint[]) {
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

function directRoute(source: ComponentAsciiNodeBox, target: ComponentAsciiNodeBox) {
  const sourceAboveTarget = source.centerY <= target.centerY
  const start = {
    x: source.centerX,
    y: sourceAboveTarget ? source.bottom + 1 : source.top - 1,
  }
  const end = {
    x: target.centerX,
    y: sourceAboveTarget ? target.top - 1 : target.bottom + 1,
  }

  if (start.x === end.x || start.y === end.y) return [start, end]
  const midY = Math.round((start.y + end.y) / 2)
  return manhattanize([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end])
}

function buildRelationshipEdges(ir: ComponentDiagramIR, g: LayoutGraph, boxesById: Map<string, ComponentAsciiNodeBox>) {
  const relationships: ComponentAsciiLayout['relationships'] = []
  g.edges().forEach(edgeObj => {
    const edge = g.edge(edgeObj) as ComponentAsciiEdgeData | undefined
    if (!edge?.relationship || edge.isDummyEdge) return
    const relationship = edge.relationship
    const source = boxesById.get(relationship.from.name)
    const target = boxesById.get(relationship.to.name)
    const useCompactRoute = Boolean(source && target && isChildToExternalGroupRelationship(ir, relationship))
    const route =
      useCompactRoute && source && target
        ? directRoute(source, target)
        : snapRouteEndpoints(manhattanize(edgePoints(edge, source, target)), source, target)
    const labelPoint = useCompactRoute
      ? midpoint(route)
      : edge.labelPoint
      ? roundPoint(edge.labelPoint)
      : midpoint(route)
    relationships.push({
      sourceId: relationship.from.name,
      targetId: relationship.to.name,
      message: relationship.message,
      lineType: relationship.line.lineType,
      isReversed: relationship.line.isReversed,
      route,
      labelPoint,
    })
  })
  return relationships
}

function wouldOverlap(a: ComponentAsciiNodeBox, b: ComponentAsciiNodeBox) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function moveNodeTop(node: ComponentAsciiNodeBox, top: number) {
  return shiftNode(node, 0, top - node.top)
}

function markNodeRows(rows: Set<number>, node: ComponentAsciiNodeBox) {
  if (node.kind === 'group') {
    rows.add(node.top)
    rows.add(node.bottom)
    return
  }

  for (let y = node.top; y <= node.bottom; y++) rows.add(y)
}

function buildYMapper(nodes: ComponentAsciiNodeBox[], relationships: ComponentAsciiLayout['relationships']) {
  const importantRows = new Set<number>()

  nodes.forEach(node => markNodeRows(importantRows, node))
  relationships.forEach(edge => {
    importantRows.add(edge.labelPoint.y)
    edge.route.forEach(point => importantRows.add(point.y))
    for (let i = 1; i < edge.route.length; i++) {
      const previous = edge.route[i - 1]
      const next = edge.route[i]
      if (previous.y === next.y) importantRows.add(previous.y)
    }
  })

  const sortedRows = Array.from(importantRows).sort((a, b) => a - b)
  const rowMap = new Map<number, number>()
  let cursor = sortedRows[0] || 0
  sortedRows.forEach((row, index) => {
    if (index === 0) {
      rowMap.set(row, cursor)
      return
    }

    const previous = sortedRows[index - 1]
    const gap = row - previous
    cursor += gap > 1 ? Math.min(gap, ASCII_VERTICAL_GAP) : gap
    rowMap.set(row, cursor)
  })

  return function mapY(y: number) {
    const mapped = rowMap.get(y)
    if (mapped !== undefined) return mapped

    let previous = sortedRows[0] || 0
    for (const row of sortedRows) {
      if (row > y) break
      previous = row
    }
    return (rowMap.get(previous) || 0) + Math.min(Math.max(0, y - previous), ASCII_VERTICAL_GAP)
  }
}

function compactVerticalGaps(layout: Omit<ComponentAsciiLayout, 'width' | 'height'>) {
  const mapY = buildYMapper(layout.nodes, layout.relationships)
  const nodes = layout.nodes.map(node => {
    const top = mapY(node.top)
    const bottom = mapY(node.bottom)
    return {
      ...node,
      top,
      bottom,
      height: bottom - top + 1,
      centerY: mapY(node.centerY),
    }
  })
  const relationships = layout.relationships.map(edge => ({
    ...edge,
    route: edge.route.map(point => ({ ...point, y: mapY(point.y) })),
    labelPoint: { ...edge.labelPoint, y: mapY(edge.labelPoint.y) },
  }))

  return { ...layout, nodes, relationships }
}

function ensureGroupBottomPadding(ir: ComponentDiagramIR, layout: Omit<ComponentAsciiLayout, 'width' | 'height'>) {
  const nodes = layout.nodes.map(node => {
    if (node.kind !== 'group') return node

    const childBottom = Math.max(
      -Infinity,
      ...layout.nodes
        .filter(child => child.id !== node.id && isInsideGroup(ir, child.id, node.id))
        .map(child => child.bottom),
    )
    if (childBottom === -Infinity || node.bottom > childBottom) return node

    const bottom = childBottom + 1
    return {
      ...node,
      bottom,
      height: bottom - node.top + 1,
    }
  })
  return { ...layout, nodes }
}

function compactChildToExternalTargets(ir: ComponentDiagramIR, nodes: ComponentAsciiNodeBox[]) {
  const boxesById = new Map(nodes.map(node => [node.id, node]))
  const compactedById = new Map(boxesById)

  ir.relationships.forEach(relationship => {
    if (!isChildToExternalGroupRelationship(ir, relationship)) return

    const sourceParent = elementParent(ir, relationship.from.name)
    const groupBox = sourceParent ? compactedById.get(sourceParent) : undefined
    const target = compactedById.get(relationship.to.name)
    if (!groupBox || !target) return

    const desiredTop = groupBox.bottom + 4
    if (target.top <= desiredTop) return

    const moved = moveNodeTop(target, desiredTop)
    const hasCollision = nodes.some(node => node.id !== target.id && wouldOverlap(moved, node))
    if (!hasCollision) compactedById.set(target.id, moved)
  })

  return nodes.map(node => compactedById.get(node.id) || node)
}

function buildSkippedRelationshipEdges(
  skippedRelationships: Relationship[],
  boxesById: Map<string, ComponentAsciiNodeBox>,
) {
  return skippedRelationships.flatMap(relationship => {
    const source = boxesById.get(relationship.from.name)
    const target = boxesById.get(relationship.to.name)
    if (!source || !target) return []
    const route = routeSkippedRelationship(relationship, source, target)
    return [
      {
        sourceId: relationship.from.name,
        targetId: relationship.to.name,
        message: relationship.message,
        lineType: relationship.line.lineType,
        isReversed: relationship.line.isReversed,
        route,
        labelPoint: midpoint(route),
      },
    ]
  })
}

function textLeft(x: number, text: string, align?: 'left' | 'center' | 'right') {
  if (align === 'center') return x - Math.floor(widthOf(text) / 2)
  if (align === 'right') return x - widthOf(text) + 1
  return x
}

function collectBounds(
  nodes: ComponentAsciiNodeBox[],
  relationships: ComponentAsciiLayout['relationships'],
  title?: string,
) {
  const points: ComponentAsciiPoint[] = []
  nodes.forEach(node => {
    points.push({ x: node.left, y: node.top }, { x: node.right, y: node.bottom })
  })
  relationships.forEach(edge => {
    points.push(...edge.route, edge.labelPoint)
    if (edge.message) {
      points.push({ x: textLeft(edge.labelPoint.x, edge.message, 'center'), y: edge.labelPoint.y })
      points.push({
        x: textLeft(edge.labelPoint.x, edge.message, 'center') + widthOf(edge.message),
        y: edge.labelPoint.y,
      })
    }
  })
  if (title) points.push({ x: 0, y: 0 }, { x: widthOf(title), y: 0 })

  return {
    minX: Math.min(0, ...points.map(point => point.x)),
    minY: Math.min(0, ...points.map(point => point.y)),
    maxX: Math.max(0, ...points.map(point => point.x)),
    maxY: Math.max(0, ...points.map(point => point.y)),
  }
}

function shiftPoint(point: ComponentAsciiPoint, dx: number, dy: number): ComponentAsciiPoint {
  return { x: point.x + dx, y: point.y + dy }
}

function shiftNode(node: ComponentAsciiNodeBox, dx: number, dy: number): ComponentAsciiNodeBox {
  return {
    ...node,
    left: node.left + dx,
    top: node.top + dy,
    right: node.right + dx,
    bottom: node.bottom + dy,
    centerX: node.centerX + dx,
    centerY: node.centerY + dy,
  }
}

function normalizeLayout(layout: Omit<ComponentAsciiLayout, 'width' | 'height'>): ComponentAsciiLayout {
  const titleOffset = layout.title ? TITLE_ROWS : 0
  const bounds = collectBounds(layout.nodes, layout.relationships, layout.title)
  const dx = -bounds.minX
  const dy = -bounds.minY + titleOffset
  const nodes = layout.nodes.map(node => shiftNode(node, dx, dy))
  const relationships = layout.relationships.map(edge => ({
    ...edge,
    route: edge.route.map(point => shiftPoint(point, dx, dy)),
    labelPoint: shiftPoint(edge.labelPoint, dx, dy),
  }))
  const shiftedBounds = collectBounds(nodes, relationships, layout.title)
  return {
    ...layout,
    nodes,
    relationships,
    width: Math.max(1, shiftedBounds.maxX + 1, widthOf(layout.title || '')),
    height: Math.max(1, shiftedBounds.maxY + 1),
  }
}

function buildComponentAsciiLayout(ir: ComponentDiagramIR, conf: ComponentConf): ComponentAsciiLayout {
  const { graph: g, skippedEdges } = buildComponentLayoutGraph(
    ir,
    {
      nodesep: ASCII_NODESEP,
      edgesep: ASCII_EDGESEP,
      ranksep: ASCII_RANKSEP,
      edgeType: conf.edgeType,
      skippedEdgeMargin: ASCII_SKIPPED_EDGE_MARGIN,
      maxSkippedEdgeMargin: ASCII_MAX_SKIPPED_EDGE_MARGIN,
    },
    createAsciiLayoutAdapter(conf),
  )

  new DagreWrapper(g).doLayout()

  const nodes = g
    .nodes()
    .map(id => rawNodeBox(ir, id, g.node(id) as LayoutNode))
    .filter(Boolean) as ComponentAsciiNodeBox[]
  const compactedNodes = compactChildToExternalTargets(ir, nodes)
  const boxesById = new Map(compactedNodes.map(node => [node.id, node]))
  const relationships = [
    ...buildRelationshipEdges(ir, g, boxesById),
    ...buildSkippedRelationshipEdges(
      skippedEdges.map(edge => edge.relationship),
      boxesById,
    ),
  ]

  return normalizeLayout(
    ensureGroupBottomPadding(
      ir,
      compactVerticalGaps({
        title: ir.title,
        nodes: compactedNodes,
        relationships,
      }),
    ),
  )
}

function pushComponent(ops: TextDiagramOp[], node: ComponentAsciiNodeBox) {
  ops.push(rectOp(node.left, node.top, node.width, node.height))
  const lines = labelLines(node.label)
  const firstY = node.top + Math.max(1, Math.floor((node.height - lines.length) / 2))
  lines.forEach((line, index) => {
    ops.push(textOp(node.centerX, firstY + index, line, 'center'))
  })
}

function pushInterface(ops: TextDiagramOp[], node: ComponentAsciiNodeBox) {
  ops.push(textOp(node.centerX, node.top, '○'))
  ops.push(textOp(node.centerX, node.top + 1, node.label.replace(/\n/g, ' '), 'center'))
}

function pushGroup(ops: TextDiagramOp[], node: ComponentAsciiNodeBox, conf: ComponentConf) {
  ops.push(rectOp(node.left, node.top, node.width, node.height, 'dashed'))
  ops.push(textOp(node.left + 2, node.top, node.label))
  if (!conf.hideGroupType && node.groupType) {
    const typeLabel = `[${node.groupType}]`
    const topTypeX = Math.max(node.left + 2, node.right - widthOf(typeLabel))
    const labelRight = node.left + 2 + widthOf(node.label)
    if (labelRight < topTypeX) {
      ops.push(textOp(topTypeX, node.top, typeLabel))
    } else {
      ops.push(textOp(node.left + 2, node.bottom, typeLabel))
    }
  }
}

function pushRoute(ops: TextDiagramOp[], edge: ComponentAsciiLayout['relationships'][number]) {
  const stroke = lineStroke(edge.lineType)
  const heads = arrowHeads(edge.lineType, edge.isReversed)
  for (let i = 1; i < edge.route.length; i++) {
    const from = edge.route[i - 1]
    const to = edge.route[i]
    if (from.x === to.x && from.y === to.y) continue
    if (from.x === to.x || from.y === to.y) {
      const segmentExtra = {
        stroke,
        ...(i === 1 && heads.startHead ? { startHead: heads.startHead } : {}),
        ...(i === edge.route.length - 1 && heads.endHead ? { endHead: heads.endHead } : {}),
      }
      ops.push(lineOp(from, to, segmentExtra))
    }
  }
  if (edge.message) ops.push(textOp(edge.labelPoint.x, edge.labelPoint.y, edge.message, 'center'))
}

function layoutToTextDiagramPlan(layout: ComponentAsciiLayout, conf: ComponentConf): TextDiagramPlan {
  const ops: TextDiagramOp[] = []
  if (layout.title) ops.push(textOp(Math.floor(layout.width / 2), 0, layout.title, 'center'))
  layout.nodes.filter(node => node.kind === 'group').forEach(node => pushGroup(ops, node, conf))
  layout.relationships.forEach(edge => pushRoute(ops, edge))
  layout.nodes.filter(node => node.kind === 'component').forEach(node => pushComponent(ops, node))
  layout.nodes.filter(node => node.kind === 'interface').forEach(node => pushInterface(ops, node))
  return {
    width: layout.width,
    height: layout.height,
    ops,
  }
}

export function toComponentTextDiagramPlan(ir: ComponentDiagramIR, conf: ComponentConf): TextDiagramPlan {
  return layoutToTextDiagramPlan(buildComponentAsciiLayout(ir, conf), conf)
}
