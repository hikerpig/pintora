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
    const width = node.outerWidth || node.width
    right = Math.max(node.x + width, right)
    top = Math.min(node.y, top)
    const height = node.outerHeight || node.height
    bottom = Math.max(node.y + height, bottom)
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
  outerWidth?: number
  height: number
  outerHeight?: number
  x: number
  y: number
  onLayout?(data: LayoutNode): void
}

export type LayoutEdge<T> = {
  points: Point[]
} & T

export function isSubgraph(g: LayoutGraph, id: string) {
  return Boolean(g.children(id).length)
}
