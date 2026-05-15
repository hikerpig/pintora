import {
  calculateTextDimensions,
  DiagramArtistOptions,
  getPointAt,
  GraphicsIR,
  Group,
  IFont,
  Path,
  Point,
  Rect,
  safeAssign,
  Text,
  TSize,
} from '@pintora/core'
import {
  adjustRootMarkBounds,
  calcDirection,
  DiagramTitleMaker,
  drawArrowTo,
  makeEmptyGroup,
  makeLabelBg,
  makeMark,
} from '../util/artist-util'
import { BaseArtist } from '../util/base-artist'
import { EnhancedConf } from '../util/config'
import { DagreWrapper } from '../util/dagre-wrapper'
import { getFontConfig } from '../util/font-config'
import { createLayoutGraph, getGraphSplinesOption, LayoutEdge, LayoutGraph, LayoutNode } from '../util/graph'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, tryExpandBounds } from '../util/mark-positioner'
import { C4Conf, getConf } from './config'
import { makeC4BoundaryMark, makeC4ElementMark } from './notation'
import { C4DiagramIR, C4Relationship } from './type'

type EdgeData = {
  relationship: C4Relationship
  labelSize?: TSize
  width?: number
  height?: number
  lineMark: Path
  relationGroupMark: Group
  relText?: Text
  relTextBg?: Rect
  onLayout(data: LayoutEdge<EdgeData>): void
}

type SkippedEdgeData = EdgeData

class C4Artist extends BaseArtist<C4DiagramIR, C4Conf> {
  customDraw(ir: C4DiagramIR, config?: C4Conf, opts?: DiagramArtistOptions): GraphicsIR {
    const conf = getConf(ir, config)
    const draw = new C4Draw(ir, conf, opts)
    return draw.draw()
  }
}

class C4Draw {
  rootMark = makeEmptyGroup()
  g: LayoutGraph
  dagreWrapper: DagreWrapper<EdgeData>
  fontConfig: IFont
  labelBounds = makeBounds()

  constructor(
    public ir: C4DiagramIR,
    public conf: EnhancedConf<C4Conf>,
    public opts?: DiagramArtistOptions,
  ) {
    this.fontConfig = getFontConfig(conf)
    this.g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    }).setGraph({
      rankdir: this.getRankDirection(),
      nodesep: conf.nodesep,
      edgesep: conf.edgesep,
      ranksep: conf.ranksep,
      splines: getGraphSplinesOption(conf.edgeType),
      avoid_label_on_border: true,
    })
    this.dagreWrapper = new DagreWrapper(this.g)
  }

  draw(): GraphicsIR {
    this.drawElements()
    this.drawBoundaries()
    const skippedEdges = this.drawRelationships()
    this.addLayoutEdgesForDisconnectedNodes()

    this.dagreWrapper.doLayout()
    this.dagreWrapper.callNodeOnLayout()
    this.dagreWrapper.callEdgeOnLayout()
    this.drawSkippedRelationships(skippedEdges)

    const gBounds = tryExpandBounds(this.dagreWrapper.getGraphBounds(), this.labelBounds)
    const titleMaker = new DiagramTitleMaker({
      title: this.ir.title,
      titleFont: this.fontConfig,
      theme: this.conf.themeConfig.themeVariables,
      className: 'c4__title',
    })
    const titleResult = titleMaker.appendTitleMark(this.rootMark)
    const { width, height } = adjustRootMarkBounds({
      rootMark: this.rootMark,
      gBounds,
      padX: this.conf.diagramPadding,
      padY: this.conf.diagramPadding,
      useMaxWidth: this.conf.useMaxWidth,
      containerSize: this.opts?.containerSize,
      ...titleResult,
    })

    return {
      mark: this.rootMark,
      width,
      height,
    }
  }

  protected getRankDirection() {
    if (this.conf.layoutDirection) return this.conf.layoutDirection
    return this.ir.diagramKind === 'context' ? 'TB' : 'LR'
  }

  protected drawElements() {
    Object.values(this.ir.elements).forEach(element => {
      const nodeMark = makeC4ElementMark(element, this.conf, this.fontConfig)
      this.rootMark.children.push(nodeMark.group)
      this.g.setNode(element.id, {
        id: element.id,
        width: nodeMark.width,
        height: nodeMark.height,
        onLayout(data: LayoutNode) {
          data.outerLeft = data.x - nodeMark.width / 2
          data.outerRight = data.x + nodeMark.width / 2
          data.outerTop = data.y - nodeMark.height / 2
          data.outerBottom = data.y + nodeMark.height / 2
          data.outerWidth = nodeMark.width
          data.outerHeight = nodeMark.height
          nodeMark.onLayout(data.x, data.y)
        },
      })
    })
  }

  protected drawBoundaries() {
    Object.values(this.ir.boundaries).forEach(boundary => {
      const nodeMark = makeC4BoundaryMark(boundary, this.conf, this.fontConfig)
      this.rootMark.children.unshift(nodeMark.group)
      this.g.setNode(boundary.id, {
        id: boundary.id,
        minwidth: nodeMark.width,
        margint: this.conf.boundaryPadding,
        marginb: this.conf.boundaryPadding,
        marginl: this.conf.boundaryPadding,
        marginr: this.conf.boundaryPadding,
        onLayout(data: LayoutNode) {
          const width = Math.max(data.width, nodeMark.width)
          data.outerLeft = data.x - width / 2
          data.outerRight = data.x + width / 2
          data.outerTop = data.y - data.height / 2
          data.outerBottom = data.y + data.height / 2
          data.outerWidth = width
          data.outerHeight = data.height
          nodeMark.onLayout(data.x, data.y, width, data.height)
        },
      })
    })

    Object.values(this.ir.elements).forEach(element => {
      if (element.parent && this.g.node(element.parent)) {
        this.g.setParent(element.id, element.parent)
      }
    })

    Object.values(this.ir.boundaries).forEach(boundary => {
      if (boundary.parent && this.g.node(boundary.parent)) {
        this.g.setParent(boundary.id, boundary.parent)
      }
    })
  }

  protected drawRelationships() {
    const skippedEdges: SkippedEdgeData[] = []

    this.ir.relationships.forEach((relationship, index) => {
      const lineMark = makeMark(
        'path',
        {
          path: [],
          stroke: this.conf.relationLineColor,
          lineCap: 'round',
          lineWidth: this.conf.lineWidth,
        },
        { class: 'c4__rel-line' },
      )

      const label = this.getRelationshipLabel(relationship)
      let relText: Text | undefined
      let relTextBg: Rect | undefined
      let labelSize: TSize | undefined
      if (label) {
        labelSize = calculateTextDimensions(label, this.fontConfig)
        relText = makeMark(
          'text',
          {
            text: label,
            fill: this.conf.textColor,
            textAlign: 'center',
            textBaseline: 'middle',
            ...this.fontConfig,
          },
          { class: 'c4__rel-label' },
        )
        relTextBg = makeLabelBg(labelSize, { x: 0, y: 0 }, { fill: this.conf.labelBackground })
      }

      const relationGroupMark = makeMark(
        'group',
        {},
        {
          class: 'c4__relationship',
          children: relTextBg && relText ? [lineMark, relTextBg, relText] : [lineMark],
          itemId: relationship.itemId,
        },
      )
      this.rootMark.children.push(relationGroupMark)

      const edgeData: EdgeData = {
        relationship,
        labelSize,
        lineMark,
        relationGroupMark,
        relText,
        relTextBg,
        onLayout: data => {
          this.applyRelationshipLayout(data.points, edgeData)
        },
      }

      if (labelSize) {
        edgeData.width = labelSize.width
        edgeData.height = labelSize.height
      }

      if (this.shouldSkipRelationshipLayout(relationship)) {
        skippedEdges.push(edgeData)
      } else {
        this.g.setEdge(relationship.source, relationship.target, edgeData, `rel-${index}`)
      }
    })

    return skippedEdges
  }

  protected addLayoutEdgesForDisconnectedNodes() {
    if (this.ir.relationships.length > 0) return

    const rootNodeIds = [
      ...Object.values(this.ir.boundaries)
        .filter(boundary => !boundary.parent)
        .map(boundary => boundary.id),
      ...Object.values(this.ir.elements)
        .filter(element => !element.parent)
        .map(element => element.id),
    ].filter(id => this.g.node(id))

    for (let i = 1; i < rootNodeIds.length; i++) {
      this.g.setEdge(rootNodeIds[i - 1], rootNodeIds[i], { weight: 0 }, `layout-${i}`)
    }
  }

  protected getRelationshipLabel(relationship: C4Relationship) {
    if (relationship.label && relationship.technology) return `${relationship.label} [${relationship.technology}]`
    return relationship.label || relationship.technology || ''
  }

  protected applyRelationshipLayout(points: Point[], edgeData: EdgeData) {
    const { relationship, lineMark, relText, relTextBg, labelSize, relationGroupMark } = edgeData
    const path = this.conf.edgeType === 'curved' ? getPointsCurvePath(points) : getPointsLinearPath(points)
    lineMark.attrs.path = path

    if (relText && relTextBg && labelSize) {
      const anchorPoint = getPointAt(points, 0.45, true)
      safeAssign(relText.attrs, { x: anchorPoint.x, y: anchorPoint.y })
      safeAssign(relTextBg.attrs, {
        x: anchorPoint.x - labelSize.width / 2,
        y: anchorPoint.y - labelSize.height / 2,
      })
      tryExpandBounds(this.labelBounds, {
        left: relTextBg.attrs.x,
        right: relTextBg.attrs.x + relTextBg.attrs.width,
        top: relTextBg.attrs.y,
        bottom: relTextBg.attrs.y + relTextBg.attrs.height,
        width: relTextBg.attrs.width,
        height: relTextBg.attrs.height,
      })
    }

    this.drawArrow(points, relationGroupMark, false)
    if (relationship.bidirectional) {
      this.drawArrow(points.slice().reverse(), relationGroupMark, true)
    }
  }

  protected drawArrow(points: Point[], relationGroupMark: Group, reverse: boolean) {
    if (points.length < 2) return
    const lastPoint = points[points.length - 1]
    const pointsForDirection = points.slice(-2)
    const arrowRad = calcDirection(pointsForDirection[0], pointsForDirection[1])
    const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
      color: this.conf.relationLineColor,
    })
    arrowMark.class = reverse ? 'c4__rel-arrow c4__rel-arrow--reverse' : 'c4__rel-arrow'
    relationGroupMark.children.push(arrowMark)
  }

  protected shouldSkipRelationshipLayout(relationship: C4Relationship) {
    return this.isAncestorOf(relationship.target, relationship.source) || this.isAncestorOf(relationship.source, relationship.target)
  }

  protected isAncestorOf(ancestorId: string, nodeId: string) {
    let parent = this.getNodeParent(nodeId)
    while (parent) {
      if (parent === ancestorId) return true
      parent = this.getNodeParent(parent)
    }
    return false
  }

  protected getNodeParent(nodeId: string) {
    return this.ir.elements[nodeId]?.parent || this.ir.boundaries[nodeId]?.parent
  }

  protected drawSkippedRelationships(skippedEdges: SkippedEdgeData[]) {
    skippedEdges.forEach(edgeData => {
      const { relationship } = edgeData
      const sourceNode = this.g.node(relationship.source) as LayoutNode | undefined
      const targetNode = this.g.node(relationship.target) as LayoutNode | undefined
      if (!sourceNode || !targetNode) return

      this.applyRelationshipLayout(this.getSkippedRelationshipPoints(relationship, sourceNode, targetNode), edgeData)
    })
  }

  protected getSkippedRelationshipPoints(relationship: C4Relationship, sourceNode: LayoutNode, targetNode: LayoutNode) {
    const sourceCenter = { x: sourceNode.x, y: sourceNode.y }
    const targetCenter = { x: targetNode.x, y: targetNode.y }

    if (this.isAncestorOf(relationship.target, relationship.source)) {
      return [this.getNodeTopCenter(sourceNode), this.getBoundaryTitlePoint(targetNode)]
    }
    if (this.isAncestorOf(relationship.source, relationship.target)) {
      return [this.getBoundaryTitlePoint(sourceNode), this.getNodeTopCenter(targetNode)]
    }

    return [sourceCenter, targetCenter]
  }

  protected getNodeTopCenter(node: LayoutNode): Point {
    return {
      x: node.x,
      y: node.y - (node.height || 0) / 2,
    }
  }

  protected getBoundaryTitlePoint(node: LayoutNode): Point {
    return {
      x: node.x,
      y: node.y - (node.height || 0) / 2 + this.conf.boundaryPadding / 2,
    }
  }
}

export default new C4Artist()
