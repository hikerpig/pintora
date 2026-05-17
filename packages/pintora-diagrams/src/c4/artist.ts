import {
  calculateTextDimensions,
  DiagramArtistOptions,
  getPointAt,
  GraphicsIR,
  Group,
  IFont,
  Mark,
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
import {
  getLineDash,
  getLineWidth,
  ResolvedC4RelationshipStyle,
  resolveElementStyle,
  resolveRelationshipStyle,
} from './style'
import { C4DiagramIR, C4ElementTagStyle, C4Relationship, C4RelationshipTagStyle } from './type'

type EdgeData = {
  relationship: C4Relationship
  style: ResolvedC4RelationshipStyle
  labelSize?: TSize
  width?: number
  height?: number
  lineMark: Path
  relationGroupMark: Group
  relText?: Text
  relTextBg?: Rect
  onLayout(data: LayoutEdge<EdgeData>): void
}

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
  legendBounds = makeBounds()

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
    this.drawLegend()

    const gBounds = tryExpandBounds(
      tryExpandBounds(this.dagreWrapper.getGraphBounds(), this.labelBounds),
      this.legendBounds,
    )
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
      const nodeMark = makeC4ElementMark(element, this.conf, this.fontConfig, resolveElementStyle(element, this.ir))
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
    const depthMap = new Map<string, number>()
    Object.keys(this.ir.boundaries).forEach(id => {
      depthMap.set(id, this.getBoundaryDepth(id))
    })

    Object.values(this.ir.boundaries)
      .sort((a, b) => depthMap.get(b.id)! - depthMap.get(a.id)!)
      .forEach(boundary => {
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
    const skippedEdges: EdgeData[] = []

    this.ir.relationships.forEach((relationship, index) => {
      const style = resolveRelationshipStyle(relationship, this.ir)
      const lineColor = style.lineColor || this.conf.relationLineColor
      const lineDash = getLineDash(style.lineStyle)
      const lineMark = makeMark(
        'path',
        {
          path: [],
          stroke: lineColor,
          lineCap: 'round',
          lineWidth: getLineWidth(this.conf.lineWidth, style.lineStyle),
          ...(lineDash ? { lineDash } : {}),
        },
        { class: 'c4__rel-line' },
      )

      const label = this.getRelationshipLabel(relationship, style)
      let relText: Text | undefined
      let relTextBg: Rect | undefined
      let labelSize: TSize | undefined
      if (label) {
        labelSize = calculateTextDimensions(label, this.fontConfig)
        relText = makeMark(
          'text',
          {
            text: label,
            fill: style.textColor || this.conf.textColor,
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
        style,
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

  protected getRelationshipLabel(relationship: C4Relationship, style: ResolvedC4RelationshipStyle = {}) {
    const technology = relationship.technology || style.techn
    const label =
      relationship.label && technology
        ? `${relationship.label} [${technology}]`
        : relationship.label || technology || ''

    if (relationship.index && label) return `${relationship.index}. ${label}`
    return relationship.index || label
  }

  protected applyRelationshipLayout(points: Point[], edgeData: EdgeData) {
    const { relationship, lineMark, relText, relTextBg, labelSize, relationGroupMark, style } = edgeData
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

    const lineColor = style.lineColor || this.conf.relationLineColor
    this.drawArrow(points, relationGroupMark, false, lineColor)
    if (relationship.bidirectional) {
      this.drawArrow(points.slice().reverse(), relationGroupMark, true, lineColor)
    }
  }

  protected drawArrow(points: Point[], relationGroupMark: Group, reverse: boolean, color: string) {
    if (points.length < 2) return
    const lastPoint = points[points.length - 1]
    const pointsForDirection = points.slice(-2)
    const arrowRad = calcDirection(pointsForDirection[0], pointsForDirection[1])
    const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
      color,
    })
    arrowMark.class = reverse ? 'c4__rel-arrow c4__rel-arrow--reverse' : 'c4__rel-arrow'
    relationGroupMark.children.push(arrowMark)
  }

  protected drawLegend() {
    if (!this.ir.legend.visible) return

    const elementEntries = this.getUsedElementTagEntries()
    const relationshipEntries = this.getUsedRelationshipTagEntries()
    if (!elementEntries.length && !relationshipEntries.length) return

    const titleFont: IFont = { ...this.fontConfig, fontWeight: 'bold' }
    const rowGap = 8
    const swatchWidth = 28
    const swatchHeight = 16
    const textGap = 8
    const padding = 10
    const title = 'Legend'
    const rows = [
      ...elementEntries.map(entry => ({ type: 'element' as const, ...entry })),
      ...relationshipEntries.map(entry => ({ type: 'relationship' as const, ...entry })),
    ]
    const titleSize = calculateTextDimensions(title, titleFont)
    const rowSizes = rows.map(row => calculateTextDimensions(row.label, this.fontConfig))
    const rowHeights = rowSizes.map(size => Math.max(swatchHeight, size.height))
    const contentWidth = Math.max(titleSize.width, ...rowSizes.map(size => swatchWidth + textGap + size.width))
    const width = contentWidth + padding * 2
    const rowsHeight = rowHeights.reduce((sum, height) => sum + height, 0)
    const height = padding * 2 + titleSize.height + rowGap + rowsHeight + (rows.length - 1) * rowGap
    const graphBounds = this.dagreWrapper.getGraphBounds()
    const x = graphBounds.right + this.conf.diagramPadding * 2
    const y = graphBounds.top

    const children: Mark[] = [
      makeMark(
        'rect',
        {
          x,
          y,
          width,
          height,
          fill: this.conf.labelBackground,
          stroke: this.conf.boundaryBorderColor,
          lineWidth: this.conf.lineWidth,
          radius: 4,
        },
        { class: 'c4__legend-rect' },
      ),
      makeMark(
        'text',
        {
          x: x + padding,
          y: y + padding,
          text: title,
          fill: this.conf.textColor,
          textAlign: 'left',
          textBaseline: 'top',
          ...titleFont,
        },
        { class: 'c4__legend-title' },
      ),
    ]

    let cursorY = y + padding + titleSize.height + rowGap
    rows.forEach((row, index) => {
      const rowHeight = rowHeights[index]
      const rowCenterY = cursorY + rowHeight / 2
      if (row.type === 'element') {
        children.push(
          makeMark(
            'rect',
            {
              x: x + padding,
              y: rowCenterY - swatchHeight / 2,
              width: swatchWidth,
              height: swatchHeight,
              radius: row.style.shape === 'roundedBox' ? 6 : 2,
              fill: row.style.bgColor || this.conf.containerBackground,
              stroke: row.style.borderColor || this.conf.boundaryBorderColor,
              lineWidth: this.conf.lineWidth,
            },
            { class: 'c4__legend-element-swatch' },
          ),
        )
      } else {
        const lineDash = getLineDash(row.style.lineStyle)
        children.push(
          makeMark(
            'path',
            {
              path: [
                ['M', x + padding, rowCenterY],
                ['L', x + padding + swatchWidth, rowCenterY],
              ],
              stroke: row.style.lineColor || this.conf.relationLineColor,
              lineWidth: getLineWidth(this.conf.lineWidth, row.style.lineStyle),
              ...(lineDash ? { lineDash } : {}),
            },
            { class: 'c4__legend-rel-swatch' },
          ),
        )
      }

      children.push(
        makeMark(
          'text',
          {
            x: x + padding + swatchWidth + textGap,
            y: rowCenterY,
            text: row.label,
            fill: row.type === 'relationship' ? row.style.textColor || this.conf.textColor : this.conf.textColor,
            textAlign: 'left',
            textBaseline: 'middle',
            ...this.fontConfig,
          },
          { class: 'c4__legend-label' },
        ),
      )
      cursorY += rowHeight + rowGap
    })

    this.rootMark.children.push(makeMark('group', {}, { class: 'c4__legend', children }))
    tryExpandBounds(this.legendBounds, {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      width,
      height,
    })
  }

  protected getUsedElementTagEntries(): Array<{ tag: string; label: string; style: C4ElementTagStyle }> {
    const usedTags = new Set(Object.values(this.ir.elements).flatMap(element => element.tags))
    return Object.values(this.ir.elementTags)
      .filter(style => usedTags.has(style.tag))
      .map(style => ({ tag: style.tag, label: style.legendText || style.tag, style }))
  }

  protected getUsedRelationshipTagEntries(): Array<{ tag: string; label: string; style: C4RelationshipTagStyle }> {
    const usedTags = new Set(this.ir.relationships.flatMap(relationship => relationship.tags))
    return Object.values(this.ir.relationshipTags)
      .filter(style => usedTags.has(style.tag))
      .map(style => ({ tag: style.tag, label: style.legendText || style.tag, style }))
  }

  protected shouldSkipRelationshipLayout(relationship: C4Relationship) {
    return (
      this.isAncestorOf(relationship.target, relationship.source) ||
      this.isAncestorOf(relationship.source, relationship.target)
    )
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

  protected getBoundaryDepth(boundaryId: string) {
    let depth = 0
    let parent = this.ir.boundaries[boundaryId]?.parent
    while (parent) {
      depth += 1
      parent = this.ir.boundaries[parent]?.parent
    }
    return depth
  }

  protected drawSkippedRelationships(skippedEdges: EdgeData[]) {
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
