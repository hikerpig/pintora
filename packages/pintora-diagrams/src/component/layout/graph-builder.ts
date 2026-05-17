import { createLayoutGraph, getGraphSplinesOption, LayoutNodeOption } from '../../util/graph'
import type { ComponentDiagramIR } from '../db'
import {
  applySkippedEdgeMargin,
  getRelationshipEdgeName,
  maybeAddGroupDummyEdge,
  shouldSkipRelationship,
} from './relationship'
import type { ComponentLayoutAdapter, ComponentLayoutGraphResult, ComponentLayoutOptions } from './types'

function withNodeId(id: string, node: LayoutNodeOption): LayoutNodeOption {
  return {
    ...node,
    id,
  }
}

export function buildComponentLayoutGraph<SkippedData = unknown>(
  ir: ComponentDiagramIR,
  options: ComponentLayoutOptions,
  adapter: ComponentLayoutAdapter<SkippedData>,
): ComponentLayoutGraphResult<SkippedData> {
  const g = createLayoutGraph({
    multigraph: true,
    directed: true,
    compound: true,
  }).setGraph({
    nodesep: options.nodesep,
    edgesep: options.edgesep,
    ranksep: options.ranksep,
    splines: getGraphSplinesOption(options.edgeType),
    avoid_label_on_border: true,
  })

  for (const component of Object.values(ir.components)) {
    g.setNode(component.name, withNodeId(component.name, adapter.measureComponent(component)))
  }

  for (const interf of Object.values(ir.interfaces)) {
    g.setNode(interf.name, withNodeId(interf.name, adapter.measureInterface(interf)))
  }

  for (const group of Object.values(ir.groups)) {
    g.setNode(group.name, withNodeId(group.name, adapter.measureGroup(group)))
  }

  for (const group of Object.values(ir.groups)) {
    for (const child of group.children) {
      if (!('name' in child)) continue

      const childNode: LayoutNodeOption = g.node(child.name)
      if (!childNode) continue

      g.setParent(childNode.id, group.name)
      if (childNode.dummyBoxId) {
        g.setParent(childNode.id, childNode.dummyBoxId)
        g.setParent(childNode.dummyBoxId, group.name)
      }
    }
  }

  const skippedEdges = []

  ir.relationships.forEach(relationship => {
    const skipInfo = shouldSkipRelationship(ir, relationship)
    if (skipInfo.shouldSkipEdge) {
      applySkippedEdgeMargin(g, relationship, skipInfo, options.skippedEdgeMargin, options.maxSkippedEdgeMargin)
      skippedEdges.push({
        relationship,
        data: adapter.onSkippedRelationship?.(relationship) as SkippedData,
      })
      return
    }

    g.setEdge(relationship.from.name, relationship.to.name, {
      name: getRelationshipEdgeName(relationship),
      relationship,
      labelpos: 'r',
      ...(adapter.makeRelationshipEdge?.(relationship) || {}),
    })
    maybeAddGroupDummyEdge(g, ir, relationship)
  })

  return { graph: g, skippedEdges }
}
