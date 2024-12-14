import { BaseDiagramIR } from '../util/ir'
import { OverrideConfigAction } from '../util/config'
import { ActionHandler, BaseDb, MakeAction } from '../util/base-db'
import { ConfigParam } from '@pintora/core'

type DOTActionPayloads = {
  overrideConfig: OverrideConfigAction
  addParam: ConfigParam
  addGraph: {
    graph: ParserDOTGraph
  }
}

export type Action = MakeAction<DOTActionPayloads>

export type DotIR = BaseDiagramIR & {
  graph: DOTGraph
}

export class DOTDb extends BaseDb {
  graph: DOTGraph

  ACTION_HANDLERS: { [K in keyof DOTActionPayloads]: ActionHandler<DOTActionPayloads, DOTDb, K> } = {
    overrideConfig(action) {
      this.addOverrideConfig(action)
    },
    addParam(action) {
      this.configParams.push(action)
    },
    addGraph(action) {
      function attrListToObject<R = any>(list: Attr[]) {
        return list.reduce((acc, attr) => {
          acc[attr.id] = attr.eq
          return acc
        }, {}) as R
      }

      function processGraph<T extends DOTGraph | Subgraph>(graph: T): T {
        const newGraph = { ...graph } as unknown as T
        const attrList: Attr[] = []
        const childList: T['children'] = []
        const attrsCollection: AttrsCollection = {}
        for (const child of newGraph.children) {
          let newChild = child
          switch (child.type) {
            case 'attr_stmt': {
              const _child = child as unknown as ParserAttrStmt
              const target = child.target || 'graph'
              if ('attr_list' in _child) {
                attrsCollection[target] = Object.assign(
                  attrsCollection[target] || {},
                  attrListToObject(_child.attr_list),
                )
                newChild = null
              }
              break
            }
            case 'node_stmt':
            case 'edge_stmt': {
              const _child = child as unknown as ParserEntityStmt
              if ('attr_list' in _child) {
                child.attrs = attrListToObject(_child.attr_list) as any
                delete _child.attr_list
              }
              break
            }
            case 'subgraph': {
              newChild = processGraph(child)
              break
            }
            case 'attr': {
              attrList.push(child)
              newChild = null
              break
            }
          }
          if (newChild) childList.push(newChild)
        }
        newGraph.children = childList
        if (attrList.length) {
          attrsCollection.graph = Object.assign(attrsCollection.graph || {}, attrListToObject(attrList))
        }
        if (Object.keys(attrsCollection).length) newGraph.attrs = attrsCollection
        return newGraph
      }
      const newGraph = processGraph<DOTGraph>(action.graph as any)

      this.graph = newGraph
    },
  }

  getDiagramIR(): DotIR {
    this.processAttrs()
    return {
      ...super.getBaseDiagramIR(),
      graph: this.graph,
    }
  }

  processAttrs() {}

  apply(action: Action | Action[]) {
    if (!action) return
    if (Array.isArray(action)) {
      action.forEach(a => this.apply(a))
      return
    }
    if (action.type in this.ACTION_HANDLERS) {
      this.ACTION_HANDLERS[action.type].call(this, action)
    }
  }

  override clear() {
    super.clear()
    this.graph = undefined
  }
}

const db = new DOTDb()

export default db

// data compatible with dotparser
export type CompassPt = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type Stmt = AttrStmt | EdgeStmt | NodeStmt | Subgraph | Attr

/** location or position */
// export type Loc = 't' | 'b'

export interface Port {
  type: 'port'
  id: string | number
  compass_pt?: CompassPt
}

export interface NodeId {
  type: 'node_id'
  id: string
  port?: Port
}

export interface HTMLString {
  type: 'id'
  value: 'string'
  html: true
}

export type DOTShapeType = 'box' | 'ellipse' | 'circle' | 'diamond' | 'plaintext'

/** node border style */
export type NodeStyle = 'solid' | 'dashed' | 'dotted' | 'bold'

// https://graphviz.org/doc/info/attrs.html
export type NodeAttrs = {
  label?: string
  /** stroke color */
  color?: string
  /** label text color */
  fontcolor?: string
  /** background color */
  bgcolor?: string
  /** font family for node label */
  fontname?: string
  /** font size for node label */
  fontsize?: number
  /** shape of node */
  shape?: DOTShapeType
  /** node edge style */
  style?: NodeStyle
  /** [pintora specific], margin top */
  margint?: number
  /** [pintora specific], margin bottom */
  margintb?: number
  /** [pintora specific], margin left */
  marginl?: number
  /** [pintora specific], margin right */
  marginr?: number
}

export type EdgeStyle = 'solid' | 'invis' | 'dashed' | 'dotted' | 'bold'

export type DOTArrowType = 'normal' | 'box' | 'obox' | 'dot' | 'odot' | 'open' | 'diamond' | 'ediamond'

export type EdgeAttrs = {
  label?: string
  /** edge line color */
  color?: string
  /** edge label text color */
  fontcolor?: string
  /** edge style */
  style?: EdgeStyle
  /** edge line width */
  penwidth?: number
  /** font family for edge label */
  fontname?: string
  /** font size for edge label */
  fontsize?: number
  /** arrow type for arrow head */
  arrowhead?: DOTArrowType
}

export type GraphAttrs = {
  label?: string
  /** stroke color */
  color?: string
  /** background color */
  bgcolor?: string
  /** font family for graph label */
  fontname?: string
  /** font size for graph label */
  fontsize?: number
}

export type AttrsCollection = Partial<{
  graph: GraphAttrs
  node: NodeAttrs
  edge: EdgeAttrs
}>

export interface Attr {
  type: 'attr'
  id: string | number
  eq: string | HTMLString
}

export interface Subgraph {
  type: 'subgraph'
  children: Stmt[]
  id?: string
  attrs?: AttrsCollection
}

export interface AttrStmt<T = NodeAttrs> {
  type: 'attr_stmt'
  target: 'graph' | 'node' | 'edge'
  attrs?: T
}

export interface EdgeStmt<T = EdgeAttrs> {
  type: 'edge_stmt'
  edge_list: (Subgraph | NodeId)[]
  attrs?: T
}

export interface NodeStmt<T = NodeAttrs> {
  type: 'node_stmt'
  nodeId: NodeId
  attrs?: T
}

export interface DOTGraph {
  type: 'graph' | 'digraph'
  children: Stmt[]
  id: string
  attrs?: AttrsCollection
}

type ToParserEntityStmt<T> = Omit<T, 'attrs'> & {
  attr_list?: Attr[]
}

export type ParserEdgeStmt = ToParserEntityStmt<EdgeStmt>
export type ParserNodeStmt = ToParserEntityStmt<NodeStmt>
export type ParserSubgraph = ToParserEntityStmt<GraphAttrs>

export type ParserEntityStmt = ParserEdgeStmt | ParserNodeStmt | ParserSubgraph

export type ParserAttrStmt = ToParserEntityStmt<AttrStmt>

export type ParserDOTGraph = Omit<DOTGraph, 'children'> & {
  children: ParserEntityStmt[]
}
