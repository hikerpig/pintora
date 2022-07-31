import {
  calculateTextDimensions,
  GraphicsIR,
  Group,
  IFont,
  last,
  makeArtist,
  makeMark,
  Mark,
  MarkAttrs,
  pick,
  Rect,
  safeAssign,
} from '@pintora/core'
import {
  adjustRootMarkBounds,
  ArrowType,
  calcDirection,
  drawArrowTo,
  makeEmptyGroup,
  makeTextAtPoint,
} from '../util/artist-util'
import { floorValues } from '../util/bound'
import { DagreWrapper } from '../util/dagre-wrapper'
import { isDev } from '../util/env'
import { createLayoutGraph, getGraphSplinesOption, LayoutEdge, LayoutGraph } from '../util/graph'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { TRANSFORM_GRAPH } from '../util/mark-positioner'
import { getTextDimensionsInPresicion } from '../util/text'
import { drawNodeShape } from './artist/draw-node'
import { StyleContext } from './artist/style-context'
import { DOTConf, getConf } from './config'
import {
  DotIR,
  EdgeStmt,
  NodeStmt,
  Subgraph,
  DOTGraph,
  NodeAttrs,
  EdgeAttrs,
  GraphAttrs,
  AttrsCollection,
  DOTArrowType,
} from './db'

class StyleContexts {
  node = new StyleContext<NodeAttrs>()
  edge = new StyleContext<EdgeAttrs>()
  graph = new StyleContext<GraphAttrs>()

  spawn() {
    const childContexts = new StyleContexts()
    childContexts.node.setParent(this.node)
    childContexts.edge.setParent(this.edge)
    childContexts.graph.setParent(this.graph)
    return childContexts
  }

  update(input: AttrsCollection) {
    if (input.graph) this.graph.setValues(input.graph)
    if (input.node) this.node.setValues(input.node)
    if (input.edge) this.edge.setValues(input.edge)
  }
}

type ParentInfo = {
  mark: Group
  id: string
  parentId?: string
  isRoot?: boolean
  styleContexts: StyleContexts
}

const artist = makeArtist<DotIR, DOTConf>({
  draw(ir, config, opts) {
    const conf = getConf(ir, config)

    const rootMark = makeEmptyGroup()

    const dotDraw = new DOTDraw(ir, conf, rootMark)
    const drawResult = dotDraw.draw()

    const gBounds = dotDraw.dagreWrapper.getGraphBounds()
    // eslint-disable-next-line prefer-const
    let { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds,
      padX: conf.diagramPadding,
      padY: conf.diagramPadding,
    })
    if (drawResult) {
      if (drawResult.labelHeight) {
        height += drawResult.labelHeight
      }
      if (drawResult.frameRect) {
        const frameAttrs = drawResult.frameRect.attrs
        safeAssign(frameAttrs, {
          width,
          height,
          x: -conf.diagramPadding,
          y: -conf.diagramPadding,
        })
      }
    }

    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
})

type EdgeData = {
  name: string
  onLayout(data: LayoutEdge<EdgeData>): void
}
class DOTDraw {
  g: LayoutGraph

  drawnNodeIds = new Set<string>()
  edgeNodeIds = new Set<string>()

  dagreWrapper: DagreWrapper

  constructor(public ir: DotIR, public conf: DOTConf, public rootMark: Group) {
    if (isDev) {
      ;(window as any).dotDraw = this
    }

    this.g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    }).setGraph({
      rankdir: conf.layoutDirection as string,
      nodesep: conf.nodesep,
      edgesep: conf.edgesep,
      ranksep: conf.ranksep,
      splines: getGraphSplinesOption(conf.edgeType),
    })

    this.dagreWrapper = new DagreWrapper(this.g)
  }

  draw() {
    const irGraph = this.ir.graph
    if (!irGraph) return

    const dagreWrapper = this.dagreWrapper

    const parentInfo: ParentInfo = {
      id: irGraph.id,
      mark: this.rootMark,
      isRoot: true,
      styleContexts: new StyleContexts(),
    }

    this.drawGraphAlike(irGraph, parentInfo)

    for (const edgeNodeId of this.edgeNodeIds) {
      if (!this.drawnNodeIds.has(edgeNodeId)) {
        this.drawNode(edgeNodeId, {}, parentInfo)
        this.g.setParent(edgeNodeId, parentInfo.id)
      }
    }

    dagreWrapper.doLayout()

    dagreWrapper.callNodeOnLayout()
    dagreWrapper.callEdgeOnLayout()

    return this.drawOutmostFrame(parentInfo)
  }

  protected drawGraphAlike(irGraph: Subgraph | DOTGraph, parentInfo: ParentInfo) {
    if (irGraph.attrs) {
      parentInfo.styleContexts.update(irGraph.attrs)
    }

    const conf = this.conf

    const graphContext = parentInfo.styleContexts.graph
    const fontConfig = this.getFontConfig(graphContext)

    const graphAttrs = irGraph.attrs?.graph || {}
    const childLabel = graphAttrs.label
    if (parentInfo.isRoot) {
      this.g.setNode(irGraph.id, {})
    } else {
      this.g.setNode(irGraph.id, {
        onLayout(data) {
          const rectGeometry = floorValues(TRANSFORM_GRAPH.graphNodeToRectStart(data))
          const graphStyle = graphAttrMapper(graphAttrs, graphContext)
          const subGraphRect = makeMark('rect', {
            ...rectGeometry,
            stroke: conf.nodeBorderColor,
            ...graphStyle,
          })
          parentInfo.mark.children.unshift(subGraphRect)

          if (childLabel) {
            const labelPoint = { x: data.x, y: data.y - data.height / 2 }
            const labelMark = makeTextAtPoint(childLabel, labelPoint, {
              textBaseline: 'top',
              ...fontConfig,
              fill: conf.labelTextColor,
              ...graphLabelAttrMapper(graphAttrs, graphContext),
            })
            parentInfo.mark.children.push(labelMark)
          }
        },
      })
    }
    irGraph.children.forEach(child => {
      switch (child.type) {
        case 'node_stmt': {
          this.drawNodeStmt(child, parentInfo)
          break
        }
        case 'edge_stmt': {
          this.drawEdgeStmt(child, parentInfo)
          break
        }
        case 'subgraph': {
          const childGroup = makeEmptyGroup()
          parentInfo.mark.children.push(childGroup)
          const newParentInfo: ParentInfo = {
            id: child.id,
            mark: childGroup,
            styleContexts: parentInfo.styleContexts.spawn(),
            parentId: parentInfo.id,
          }
          this.drawGraphAlike(child, newParentInfo)
          this.g.setParent(child.id, irGraph.id)

          break
        }
      }
    })
  }

  protected drawNodeStmt(stmt: NodeStmt, parentInfo: ParentInfo) {
    const { nodeId } = stmt
    this.g.setParent(nodeId.id, parentInfo.id)
    this.drawNode(nodeId.id, stmt.attrs, parentInfo)
    this.drawnNodeIds.add(nodeId.id)
  }

  protected drawNode(name: string, nodeAttrs: NodeAttrs = {}, parentInfo: ParentInfo) {
    const label = nodeAttrs.label || name
    const nodeStyleContext = parentInfo.styleContexts.node
    const fontConfig = this.getFontConfig(nodeStyleContext)
    const textDims = getTextDimensionsInPresicion(label, fontConfig)
    const width = textDims.width + this.conf.nodePadding * 2
    const height = textDims.height + this.conf.nodePadding * 2
    const layoutAttrs = nodeLayoutAttrMapper(nodeAttrs, nodeStyleContext)
    this.g.setNode(name, {
      width,
      height,
      ...layoutAttrs,
      onLayout: data => {
        const nodeShapeResult = drawNodeShape({
          data,
          nodeAttrs,
          textDims,
          markAttrs: {
            stroke: this.conf.nodeBorderColor,
            radius: this.conf.nodeBorderRadius,
            ...nodeAttrsToStyle(nodeAttrs, nodeStyleContext),
          },
        })

        const textMark = makeMark('text', {
          text: label,
          x: data.x,
          y: data.y,
          fill: this.conf.labelTextColor,
          ...fontConfig,
          ...nodeAttrsToLabelStyle(nodeAttrs, nodeStyleContext),
          textAlign: 'center',
          textBaseline: 'middle',
        })
        parentInfo.mark.children.push(nodeShapeResult.containerNode, textMark)
      },
    })
  }

  protected drawEdgeStmt(stmt: EdgeStmt, parentInfo: ParentInfo) {
    const { edge_list, attrs = {} } = stmt
    const tuples = zipTuple(edge_list.slice(0, edge_list.length - 1), edge_list.slice(1))
    const edgeGroup = makeEmptyGroup()
    const graphAttrs = graphAttrMapper({}, parentInfo.styleContexts.graph)
    parentInfo.mark.children.push(edgeGroup)
    const isDirected = this.ir.graph.type === 'digraph'
    const isInvisible = attrs.style === 'invis'
    tuples.forEach(([v1, v2]) => {
      this.edgeNodeIds.add(v1.id)
      this.edgeNodeIds.add(v2.id)
      const conf = this.conf
      this.g.setEdge(v1.id, v2.id, {
        onLayout: edge => {
          if (isInvisible) return
          const shouldUseCurvePath = this.conf.edgeType === 'curved'
          const edgeStyleContext = parentInfo.styleContexts.edge
          const path = shouldUseCurvePath ? getPointsCurvePath(edge.points) : getPointsLinearPath(edge.points)
          const pathAttrs = edgeAttrsToStyle(attrs, edgeStyleContext)
          const pathMark = makeMark('path', { path, stroke: conf.edgeColor, ...pathAttrs })
          edgeGroup.children.push(pathMark)
          if (isDirected) {
            const lastPoint = last(edge.points)
            const arrowDirection = calcDirection(edge.points[edge.points.length - 2], lastPoint)
            const arrowHeadType: DOTArrowType = attrs.arrowhead || edgeStyleContext.getValue('arrowhead') || 'normal'
            const arrowMark = drawArrowTo(last(edge.points), 8, arrowDirection, {
              type: ARROW_TYPE_MAP[arrowHeadType] || 'triangle',
              color: pathAttrs.stroke || conf.edgeColor,
              bgColor: graphAttrs.fill || this.conf.backgroundColor,
            })
            edgeGroup.children.push(arrowMark)
          }

          const anchorPoint = edge.labelPoint || edge.points[1]
          if (attrs.label) {
            const textColor = attrs.fontcolor || this.conf.labelTextColor
            const labelMark = makeMark(
              'text',
              {
                text: attrs.label,
                id: [v1.id, v2.id].join('-'),
                textAlign: 'center',
                textBaseline: 'middle',
                ...anchorPoint,
                fill: textColor,
                ...this.getFontConfig(edgeStyleContext),
              },
              { class: 'activity__edge-label' },
            )
            edgeGroup.children.push(labelMark)
          }
        },
      } as EdgeData)
    })
  }

  /**
   * this should be call after all layout are done,
   *   so we can position label by current bounds
   */
  protected drawOutmostFrame(parentInfo: ParentInfo) {
    const irGraph = this.ir.graph
    if (!irGraph.attrs?.graph) return
    const graphAttrs = irGraph.attrs.graph
    const conf = this.conf
    const bounds = this.dagreWrapper.getGraphBounds()
    let frameRect: Rect | undefined
    const graphContext = parentInfo.styleContexts.graph
    if (graphAttrs.bgcolor) {
      const rectGeometry = bounds
      const graphStyle = graphAttrMapper(graphAttrs, graphContext)
      frameRect = makeMark(
        'rect',
        {
          ...pick(rectGeometry, ['width', 'height']),
          ...graphStyle,
          stroke: 'transparent',
        },
        { class: 'dot__frame-bg' },
      )
      parentInfo.mark.children.unshift(frameRect)
    }

    const label = graphAttrs.label
    let labelHeight = 0
    if (label) {
      const fontConfig = this.getFontConfig(graphContext)
      const labelPoint = { x: bounds.left + bounds.width / 2, y: bounds.bottom }
      labelHeight = calculateTextDimensions(label, fontConfig).height
      const labelMark = makeTextAtPoint(label, labelPoint, {
        textBaseline: 'top',
        ...fontConfig,
        fill: conf.labelTextColor,
        ...graphLabelAttrMapper(graphAttrs, graphContext),
      })
      parentInfo.mark.children.push(labelMark)
    }

    return {
      labelHeight,
      frameRect,
    }
  }

  protected getFontConfig(styleContext?: StyleContext) {
    const fontsizeStr = styleContext?.getValue('fontsize') as unknown as string
    return {
      fontSize: (fontsizeStr && parseFloat(fontsizeStr)) || this.conf.fontSize,
      fontFamily: styleContext?.getValue('fontname') || this.conf.fontFamily,
      fontWeight: this.conf.fontWeight,
    } as IFont
  }
}

/**
 * @example zip([1, 2, 3], ['a', 'b', 'c']) -> [[1, 'b'], [2, 'c']]
 */
function zipTuple<T1, T2>(arr1: T1[], arr2: T2[]) {
  const output: Array<[T1, T2]> = []
  for (let i = 0; i < arr1.length; i++) {
    if (i < arr2.length) {
      output.push([arr1[i], arr2[i]])
    }
  }
  return output
}

function makeAttrMapper<RawAttrs, ResultAttrs = MarkAttrs>(mapping: Record<string, keyof ResultAttrs>) {
  return (input: RawAttrs, styleContext: StyleContext | null) => {
    const attrs: Mark['attrs'] = {}
    for (const [nodeKey, attrKey] of Object.entries(mapping)) {
      const v = input[nodeKey] || styleContext?.getValue(nodeKey)
      if (v) {
        attrs[attrKey as any] = v
      }
    }
    return attrs
  }
}

const NODE_ATTR_MAP = {
  color: 'stroke',
  bgcolor: 'fill',
}
const nodeAttrMapper = makeAttrMapper<NodeAttrs>(NODE_ATTR_MAP)
function nodeAttrsToStyle(nodeAttrs: NodeAttrs, styleContext: StyleContext): Mark['attrs'] {
  const attrs = nodeAttrMapper(nodeAttrs, styleContext)
  return attrs
}

const NODE_LABEL_ATTR_MAP = {
  fontcolor: 'fill',
}
const nodeLabelAttrMapper = makeAttrMapper<NodeAttrs>(NODE_LABEL_ATTR_MAP)
function nodeAttrsToLabelStyle(nodeAttrs: NodeAttrs, styleContext: StyleContext): Mark['attrs'] {
  const attrs = nodeLabelAttrMapper(nodeAttrs, styleContext)
  return attrs
}

const nodeLayoutAttrMapper = makeAttrMapper<NodeAttrs>({
  margint: 'margint',
  marginb: 'marginb',
  marginl: 'marginl',
  marginr: 'marginr',
})

const EDGE_ATTR_MAP = {
  color: 'stroke',
}
const edgeAttrMapper = makeAttrMapper<EdgeAttrs>(EDGE_ATTR_MAP)
function edgeAttrsToStyle(edgeAttrs: EdgeAttrs, styleContext: StyleContext): Mark['attrs'] {
  const attrs = edgeAttrMapper(edgeAttrs, styleContext)
  return attrs
}

const GRAPH_ATTR_MAP: Partial<Record<keyof GraphAttrs, keyof MarkAttrs>> = {
  color: 'stroke',
  bgcolor: 'fill',
}
const graphAttrMapper = makeAttrMapper<GraphAttrs>(GRAPH_ATTR_MAP)

const graphLabelAttrMapper = makeAttrMapper<GraphAttrs>({
  ...NODE_LABEL_ATTR_MAP,
})

const ARROW_TYPE_MAP: Record<DOTArrowType, ArrowType> = {
  normal: 'triangle',
  box: 'box',
  obox: 'obox',
  dot: 'dot',
  odot: 'odot',
  open: 'default',
  diamond: 'diamond',
  ediamond: 'ediamond',
}

export default artist
