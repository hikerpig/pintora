import {
  IDiagramArtist,
  Group,
  calculateTextDimensions,
  getPositionOfRect,
  PositionV,
  PositionH,
  Bounds,
  Point,
  IFont,
} from '@pintora/core'
import { MindmapIR, MMItem, MMTree } from './db'
import { MindmapConf, getConf } from './config'
import {
  adjustEntities,
  createLayoutGraph,
  getGraphBounds,
  isGraphVertical,
  LayoutEdge,
  LayoutGraph,
  LayoutNode,
} from '../util/graph'
// eslint-disable-next-line unused-imports/no-unused-imports
import { makeMark, makeEmptyGroup, adjustRootMarkBounds, makeCircleInPoint } from '../util/artist-util'
import dagre from '@pintora/dagre'
import { getPointsLinearPath } from '../util/line-util'
import db from './db'
import { makeBounds, positionGroupContents, TRANSFORM_GRAPH } from '../util/mark-positioner'
import { isDev } from '../util/env'

let conf: MindmapConf
let mmDraw: MMDraw

const mmArtist: IDiagramArtist<MindmapIR, MindmapConf> = {
  draw(ir, config) {
    conf = Object.assign(getConf(ir), config || {})
    mmDraw = new MMDraw(ir)
    if (isDev) {
      ;(window as any).mmDraw = mmDraw
    }

    const rootMark: Group = {
      type: 'group',
      attrs: {},
      children: [],
    }

    mmDraw.drawTo(rootMark)

    const bounds = getGraphBounds(mmDraw.g)
    const { width, height } = adjustRootMarkBounds(rootMark, bounds, conf.diagramPadding, conf.diagramPadding)
    return {
      width,
      height,
      mark: rootMark,
    }
  },
}

type EdgeData = LayoutEdge<{
  label?: string
  isReverse?: boolean
}>

class MMDraw {
  protected trees: MMTree[]
  g: LayoutGraph

  constructor(public ir: MindmapIR) {
    this.trees = ir.trees.map(data => {
      return db.getTreeByData(data)
    })

    this.g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    })
      .setGraph({
        rankdir: conf.layoutDirection as string,
        nodesep: 30,
        edgesep: 30,
        ranksep: conf.levelDistance,
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })
  }

  drawTo(rootMark: Group) {
    this.trees.map(tree => this.drawTree(rootMark, tree))

    dagre.layout(this.g)
    adjustEntities(this.g)

    this.drawEdgesTo(rootMark)
  }

  protected drawTree(rootMark: Group, tree: MMTree) {
    tree.walkTree(tree.root, node => {
      this.drawNode(rootMark, tree, node)
    })
  }

  protected getNodeStyleOfLevel(level: number) {
    const bgColor = conf[`l${level}NodeBgColor`] || conf.nodeBgColor
    const textColor = conf[`l${level}NodeTextColor`] || conf.textColor
    return { bgColor, textColor }
  }

  protected drawNode(rootMark: Group, tree: MMTree, node: MMItem) {
    const fontSize = Math.max(conf.minFontSize, conf.maxFontSize - (node.depth - 1) * 2)

    const fontConfig = getFontConfig(conf, { fontSize, fontWeight: conf.nodeFontWeight })
    const labelDim = calculateTextDimensions(node.label, fontConfig)

    const group = makeEmptyGroup()
    group.class = 'mindmap__node'

    const padding = Math.ceil(fontSize * 0.75)
    const rectWidth = labelDim.width + padding * 2
    const rectHeight = labelDim.height + padding * 2

    const nodeStyle = this.getNodeStyleOfLevel(node.depth)
    const bgMark = makeMark('rect', {
      x: -rectWidth / 2,
      y: -rectHeight / 2,
      width: rectWidth,
      height: rectHeight,
      fill: nodeStyle.bgColor,
      radius: conf.borderRadius,
    })

    const textMark = makeMark('text', {
      text: node.label,
      fill: nodeStyle.textColor,
      textBaseline: 'middle',
      textAlign: 'center',
      ...fontConfig,
    })

    group.children.push(bgMark, textMark)

    this.g.setNode(node.id, {
      width: rectWidth,
      height: rectHeight,
      onLayout(data) {
        // console.log('[drawNode] onLayout', data)
        positionGroupContents(group, data)
      },
    })

    node.children.forEach(childId => {
      const childNode = tree.getNode(childId)
      if (childNode.isReverse) {
        this.g.setEdge(childId, node.id, { label: `${childNode.label}-${node.label}`, isReverse: true })
      } else {
        this.g.setEdge(node.id, childId, { label: `${node.label}-${node.label}` })
      }
    })

    rootMark.children.push(group)
  }

  protected drawEdgesTo(rootMark: Group) {
    const edgeGroup = makeEmptyGroup()
    const g = this.g
    this.g.edges().forEach(e => {
      const edge: EdgeData = g.edge(e)
      if (!edge.points) return

      const isVertical = isGraphVertical(g)

      // construct new points
      const fromNode = g.node(e.v) as LayoutNode
      const toNode = g.node(e.w) as LayoutNode
      // console.log('edge', edge, e, fromNode, toNode)
      let fromOutPoint: Point
      let toInPoint: Point
      // const isReverse = false
      const { isReverse } = edge
      if (isVertical) {
        fromOutPoint = getPositionOfRect(
          TRANSFORM_GRAPH.graphNodeToRectStart(isReverse ? toNode : fromNode),
          PositionH.CENTER | (isReverse ? PositionV.TOP : PositionV.BOTTOM),
        )
        toInPoint = getPositionOfRect(
          TRANSFORM_GRAPH.graphNodeToRectStart(isReverse ? fromNode : toNode),
          PositionH.CENTER | (isReverse ? PositionV.BOTTOM : PositionV.TOP),
        )
      } else {
        fromOutPoint = getPositionOfRect(
          TRANSFORM_GRAPH.graphNodeToRectStart(isReverse ? toNode : fromNode),
          (isReverse ? PositionH.LEFT : PositionH.RIGHT) | PositionV.CENTER,
        )
        toInPoint = getPositionOfRect(
          TRANSFORM_GRAPH.graphNodeToRectStart(isReverse ? fromNode : toNode),
          (isReverse ? PositionH.RIGHT : PositionH.LEFT) | PositionV.CENTER,
        )
      }

      const nextLevelIds = isReverse ? g.predecessors(e.w) : g.successors(e.v)
      const nextLevelBounds = nextLevelIds.reduce((acc: Bounds, id) => {
        const nodeData = TRANSFORM_GRAPH.graphNodeToRectStart(g.node(id) as LayoutNode)
        if (nodeData.x < acc.left) acc.left = nodeData.x
        const right = nodeData.x + nodeData.width
        if (right > acc.right) acc.right = right

        acc.top = Math.min(nodeData.y, acc.top)
        acc.bottom = Math.max(nodeData.y + nodeData.height, acc.bottom)
        return acc
      }, makeBounds())

      // for debug
      // const fromOutPositionMarker = makeCircleInPoint(fromOutPoint)
      // const toInPositionMarker = makeCircleInPoint(toInPoint, { fill: 'green' })
      // const nextLevelBoundsRect = makeMark('rect', {
      //   width: nextLevelBounds.right - nextLevelBounds.left,
      //   height: nextLevelBounds.bottom - nextLevelBounds.top,
      //   x: nextLevelBounds.left,
      //   y: nextLevelBounds.top,
      //   stroke: 'red',
      // })
      // edgeGroup.children.push(fromOutPositionMarker, toInPositionMarker, nextLevelBoundsRect)
      // end for debug

      let newPoints: Point[]
      if (isVertical) {
        const middleY = isReverse
          ? (fromOutPoint.y + nextLevelBounds.bottom) / 2
          : (fromOutPoint.y + nextLevelBounds.top) / 2
        newPoints = [fromOutPoint, { x: fromOutPoint.x, y: middleY }, { x: toInPoint.x, y: middleY }, toInPoint]
      } else {
        // the middle of output and the left of next level's boundings
        const middleX = isReverse
          ? (fromOutPoint.x + nextLevelBounds.right) / 2
          : (fromOutPoint.x + nextLevelBounds.left) / 2
        newPoints = [fromOutPoint, { x: middleX, y: fromOutPoint.y }, { x: middleX, y: toInPoint.y }, toInPoint]
      }

      // const forkPointX1 = fromOutPoint.x + (nextLevelBounds.left - fromOutPoint.x) / 3
      // const forkPointX2 = fromOutPoint.x + (nextLevelBounds.left - fromOutPoint.x) / 3 * 2
      // const newPoints = [fromOutPoint, { x: forkPointX1, y: fromOutPoint.y}, { x: forkPointX2, y: toInPoint.y }, toInPoint]
      // const path = conf.curvedEdge ? getPointsCurvePath(newPoints) : getPointsLinearPath(newPoints)

      const path = getPointsLinearPath(newPoints)
      const linePath = makeMark('path', {
        path,
        stroke: conf.edgeColor,
        lineJoin: 'round',
      })
      edgeGroup.children.push(linePath)
    })
    rootMark.children.push(edgeGroup)
  }
}

function getFontConfig(conf: MindmapConf, f: Partial<IFont>) {
  return {
    fontFamily: conf.fontFamily,
    ...f,
  } as IFont
}

export default mmArtist
