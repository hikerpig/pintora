import dagre from '@pintora/dagre'
import { getGraphBounds, LayoutEdge, LayoutGraph, LayoutNode } from './graph'

export interface IEdgeData<E = unknown> {
  onLayout(data: LayoutEdge<E>): void
}

/**
 * Some common methods dealing with dagre layout
 */
export class DagreWrapper<E extends IEdgeData = IEdgeData, N extends LayoutNode = LayoutNode> {
  constructor(public g: LayoutGraph) {}

  doLayout() {
    dagre.layout(this.g)
  }

  callNodeOnLayout() {
    const graph = this.g
    graph.nodes().forEach(function (v) {
      const nodeData = graph.node(v) as unknown as N
      if (nodeData) {
        if (nodeData.onLayout) {
          nodeData.onLayout(nodeData)
        }
      }
    })
  }

  callEdgeOnLayout() {
    const graph = this.g
    graph.edges().forEach(function (e) {
      const edgeData: LayoutEdge<E> = graph.edge(e)
      if (edgeData) {
        if (edgeData.onLayout) {
          edgeData.onLayout(edgeData)
        }
      }
    })
  }

  getGraphBounds() {
    return getGraphBounds(this.g)
  }
}
