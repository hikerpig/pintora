import { Mark, Bounds, Point } from '@pintora/core'
import { Graph, Edge, GraphOptions } from '@pintora/graphlib'

export type LayoutGraph = Graph

export function createLayoutGraph(opts?: GraphOptions) {
  return new Graph(opts)
}

export function getGraphBounds(g: LayoutGraph): Bounds {
  let left = 0
  let right = 0
  let top = 0
  let bottom = 0
  g.nodes().forEach((k) => {
    const node: LayoutNode = g.node(k)
    left = Math.min(node.x, left)
    right = Math.max(node.x + node.width, right)
    top = Math.min(node.y, top)
    bottom = Math.max(node.y + node.height, bottom)
  })

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

export interface LayoutNode {
  id?: string
  mark?: Mark
  width: number
  height: number
  x: number
  y: number
  onLayout?(data: LayoutNode): void
}

export type LayoutEdge<T> = {
  points: Point[]
} & T

// export type LayoutLink = Link<LayoutLinkData>

// export type LayoutGroup = COLA.Group

// export function getLayoutNodes(g: LayoutGraph) {
//   const nodes: COLA.InputNode[] = []
//   let index = 0
//   g.forEachNode(node => {
//     node.data.index = index++
//     nodes.push(node.data)
//   })
//   // console.log('nodes', nodes)
//   return nodes
// }

// export function getLayoutLinks(g: LayoutGraph) {
//   const links: COLA.Link<COLA.InputNode>[] = []
//   g.forEachLink(link => {
//     const fromNode = g.getNode(link.fromId).data
//     const toNode = g.getNode(link.toId).data
//     links.push({
//       source: fromNode,
//       target: toNode,
//     })
//   })
//   // console.log('links', links)
//   return links
// }

// export function fillLayoutWithGraph(layout: COLA.Layout, g: LayoutGraph) {
//   layout
//     .nodes(getLayoutNodes(g)).links(getLayoutLinks(g) as any)
//   return layout
// }
