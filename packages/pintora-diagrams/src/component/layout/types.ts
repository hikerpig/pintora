import type { LayoutNodeOption } from '../../util/graph'
import type { EdgeType } from '../../util/config'
import type { CGroup, Component, Interface, Relationship } from '../db'

export type ComponentLayoutOptions = {
  nodesep: number
  edgesep: number
  ranksep: number
  edgeType: EdgeType
  skippedEdgeMargin?: number
  maxSkippedEdgeMargin?: number
}

export type ComponentLayoutAdapter<SkippedData = unknown> = {
  measureComponent(component: Component): LayoutNodeOption
  measureInterface(interf: Interface): LayoutNodeOption
  measureGroup(group: CGroup): LayoutNodeOption
  makeRelationshipEdge?(relationship: Relationship): object
  onSkippedRelationship?(relationship: Relationship): SkippedData
}

export type ComponentLayoutSkippedEdge<SkippedData = unknown> = {
  relationship: Relationship
  data: SkippedData
}

export type ComponentLayoutGraphResult<SkippedData = unknown> = {
  graph: import('../../util/graph').LayoutGraph
  skippedEdges: ComponentLayoutSkippedEdge<SkippedData>[]
}
