import {
  GraphicsIR,
  Text,
  Group,
  safeAssign,
  calculateTextDimensions,
  Rect,
  TSize,
  getPointAt,
  symbolRegistry,
  GSymbol,
  IFont,
  Bounds,
  compact,
} from '@pintora/core'
import { CGroup, Component, ComponentDiagramIR, Interface, LineType, Relationship } from './db'
import { ComponentConf, getConf } from './config'
import type { EnhancedConf } from '../util/config'
import { LayoutEdge, LayoutGraph, LayoutNode, LayoutNodeOption } from '../util/graph'
import {
  makeMark,
  drawArrowTo,
  calcDirection,
  makeLabelBg,
  adjustRootMarkBounds,
  DiagramTitleMaker,
} from '../util/artist-util'
import { makeBounds, tryExpandBounds } from '../util/mark-positioner'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { DagreWrapper } from '../util/dagre-wrapper'
import { getFontConfig } from '../util/font-config'
import { BaseArtist } from '../util/base-artist'
import { buildComponentLayoutGraph } from './layout/graph-builder'
import type { ComponentLayoutAdapter } from './layout/types'
import { toComponentTextDiagramPlan } from './ascii'

let conf: EnhancedConf<ComponentConf>
let fontConfig: IFont

type EdgeOnLayoutContext = {
  updateBounds(b: Bounds): void
}

type EdgeData = {
  name: string
  relationship: Relationship
  onLayout(data: LayoutEdge<EdgeData>, context: EdgeOnLayoutContext): void
  /** this edge is for layout, should not be drawn */
  isDummyEdge?: boolean
  labelSize?: TSize
}

/** Data for edges that were skipped in dagre layout but need manual drawing */
type SkippedEdgeData = {
  relationship: Relationship
  lineMark: ReturnType<typeof makeMark>
  relationGroupMark: Group
  shouldDrawArrow: boolean
  relText?: Text
  relTextBg?: Rect
  labelDims?: TSize
}

type NodeExtra = {
  titleAnchorYOffset?: number
}
function setNodeExtra(node: LayoutNode<NodeExtra>, key: keyof NodeExtra, value: NodeExtra[keyof NodeExtra]) {
  if (!node.extra) {
    node.extra = {}
  }
  node.extra[key] = value
}

function getNodeExtra(node: LayoutNode<NodeExtra>, key: keyof NodeExtra): NodeExtra[keyof NodeExtra] {
  return node.extra?.[key]
}

/**
 * Apply edge layout to a relationship line, label, and arrow.
 * Extracted to avoid duplication between dagre onLayout and manual skipped edge drawing.
 */
function applyEdgeLayout(params: {
  points: { x: number; y: number }[]
  lineMark: ReturnType<typeof makeMark>
  relText?: Text
  relTextBg?: Rect
  labelDims?: TSize
  shouldDrawArrow: boolean
  relationGroupMark: Group
  updateBounds?: (b: Bounds) => void
}) {
  const { points, lineMark, relText, relTextBg, labelDims, shouldDrawArrow, relationGroupMark, updateBounds } = params

  // Create the path
  const newPath = conf.edgeType === 'curved' ? getPointsCurvePath(points) : getPointsLinearPath(points)
  lineMark.attrs.path = newPath

  // Position label if present
  if (relText && relTextBg && labelDims) {
    const anchorPoint = getPointAt(points, 0.4, true)
    safeAssign(relText.attrs, { x: anchorPoint.x, y: anchorPoint.y })
    safeAssign(relTextBg.attrs, {
      x: anchorPoint.x - labelDims.width / 2,
      y: anchorPoint.y - labelDims.height / 2,
    })
    if (updateBounds) {
      const bgAttrs = relTextBg.attrs
      updateBounds({
        left: bgAttrs.x,
        right: bgAttrs.x + bgAttrs.width,
        top: bgAttrs.y,
        bottom: bgAttrs.y + bgAttrs.height,
        width: bgAttrs.width,
        height: bgAttrs.height,
      })
    }
  }

  // Draw arrow if needed
  if (shouldDrawArrow) {
    const lastPoint = points[points.length - 1]
    const pointsForDirection = points.slice(-2)
    const arrowRad = calcDirection.apply(null, pointsForDirection)
    const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
      color: conf.relationLineColor,
    })
    relationGroupMark.children.push(arrowMark)
  }
}

class ComponentArtist extends BaseArtist<ComponentDiagramIR, ComponentConf> {
  customDraw(ir, config, opts?) {
    // console.info('[artist] component', ir)
    conf = getConf(ir, config)
    fontConfig = getFontConfig(conf)

    const rootMark: Group = {
      type: 'group',
      attrs: {},
      children: [],
    }

    const adapter = createSvgComponentLayoutAdapter(rootMark)
    const { graph: g, skippedEdges } = buildComponentLayoutGraph(
      ir,
      {
        nodesep: 20,
        edgesep: conf.edgesep,
        ranksep: conf.ranksep,
        edgeType: conf.edgeType,
      },
      adapter,
    )
    const dagreWrapper = new DagreWrapper(g)

    dagreWrapper.doLayout()

    const { labelBounds } = adjustMarkInGraph(dagreWrapper)

    // Draw manually the edges that were skipped (child-parent relationships)
    const skippedEdgeBounds = drawSkippedEdges(skippedEdges.map(edge => edge.data).filter(Boolean), g)

    // Merge all bounds: graph bounds, regular edge label bounds, and skipped edge bounds
    const gBounds = tryExpandBounds(tryExpandBounds(dagreWrapper.getGraphBounds(), labelBounds), skippedEdgeBounds)
    const pad = conf.diagramPadding

    const titleFont: IFont = fontConfig
    const titleMaker = new DiagramTitleMaker({
      title: ir.title,
      titleFont,
      theme: conf.themeConfig.themeVariables,
      className: 'component__title',
    })
    const titleResult = titleMaker.appendTitleMark(rootMark)

    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds,
      padX: pad,
      padY: pad,
      useMaxWidth: conf.useMaxWidth,
      containerSize: opts?.containerSize,
      ...titleResult,
    })

    return {
      mark: rootMark,
      width,
      height,
      rendererData: {
        ascii: {
          plan: toComponentTextDiagramPlan(ir, conf),
        },
      },
    } as GraphicsIR
  }
}
const componentArtist = new ComponentArtist()

function createSvgComponentLayoutAdapter(parentMark: Group): ComponentLayoutAdapter<SkippedEdgeData> {
  return {
    measureComponent(component: Component) {
      const id = component.name
      const itemId = component.itemId
      const label = component.label || component.name
      const componentLabelDims = calculateTextDimensions(label || '', fontConfig)
      const compWidth = Math.round(componentLabelDims.width + conf.componentPadding * 2)
      const compHeight = Math.round(componentLabelDims.height + conf.componentPadding * 2)
      const rectMark = makeMark(
        'rect',
        {
          width: compWidth,
          height: compHeight,
          fill: conf.componentBackground,
          stroke: conf.componentBorderColor,
          lineWidth: conf.lineWidth,
          radius: 4,
        },
        { class: 'component__component-rect' },
      )

      const textMark = makeMark('text', {
        text: label,
        fill: conf.textColor,
        textAlign: 'center',
        textBaseline: 'middle',
        ...fontConfig,
      })
      const group = makeMark(
        'group',
        {},
        {
          children: [rectMark, textMark],
          class: 'component__component',
          itemId,
        },
      )
      parentMark.children.push(group)

      return {
        width: compWidth,
        height: compHeight,
        id,
        onLayout(data: LayoutNode) {
          const { x, y } = data
          safeAssign(rectMark.attrs, { x: x - compWidth / 2, y: y - compHeight / 2 })
          safeAssign(textMark.attrs, { x, y })
        },
      }
    },

    measureInterface(interf: Interface) {
      const id = interf.name
      const itemId = interf.itemId
      const label = interf.label || interf.name
      const labelDims = calculateTextDimensions(label, fontConfig)
      const interfaceSize = conf.interfaceSize
      const circleMark = makeMark(
        'circle',
        {
          x: 0,
          y: 0,
          r: interfaceSize / 2,
          fill: conf.componentBackground,
          stroke: conf.componentBorderColor,
          lineWidth: conf.lineWidth,
        },
        { class: 'component__interface-circle', itemId },
      )

      const textMark = makeMark('text', {
        text: label,
        fill: conf.textColor,
        textAlign: 'center',
        textBaseline: 'top',
        ...fontConfig,
      })
      const group = makeMark(
        'group',
        {},
        {
          children: [circleMark, textMark],
          class: 'component__interface',
          itemId,
        },
      )
      parentMark.children.push(group)

      const outerWidth = Math.max(interfaceSize, labelDims.width)
      const nodeHeight = interfaceSize + labelDims.height
      const layoutNode: LayoutNodeOption = {
        width: interfaceSize,
        height: nodeHeight,
        id,
        outerWidth,
        onLayout(data: LayoutNode) {
          const { x, y } = data
          safeAssign(circleMark.attrs, { x, y: y - labelDims.height / 2 + 2 })
          safeAssign(textMark.attrs, { x, y: y + 2 })
        },
      }

      if (labelDims.width > interfaceSize) {
        const marginH = (labelDims.width - interfaceSize) / 2
        layoutNode.marginl = marginH
        layoutNode.marginr = marginH
      }

      return layoutNode
    },

    measureGroup(cGroup: CGroup) {
      const groupId = cGroup.name
      const itemId = cGroup.itemId
      const groupType = cGroup.groupType

      let bgMark: Rect | GSymbol
      const symbolDef = symbolRegistry.get(groupType)
      if (!symbolDef) {
        bgMark = makeMark(
          'rect',
          {
            fill: conf.groupBackground,
            stroke: conf.groupBorderColor,
            lineWidth: conf.groupBorderWidth,
            radius: 2,
          },
          { class: 'component__group-rect' },
        )
      }

      const groupLabel = cGroup.label || cGroup.name
      const labelMark = makeMark(
        'text',
        {
          text: groupLabel,
          fill: conf.textColor,
          textAlign: 'center',
          ...fontConfig,
          fontWeight: 'bold',
        },
        { class: 'component__group-label' },
      )
      let typeMark: Text | undefined
      const typeText = `[${cGroup.groupType}]`
      if (!conf.hideGroupType) {
        typeMark = makeMark(
          'text',
          {
            text: typeText,
            fill: conf.textColor,
            ...fontConfig,
            textBaseline: 'hanging',
          },
          { class: 'component__type' },
        )
      }

      const labelTextDims = calculateTextDimensions(groupLabel, {
        ...fontConfig,
        fontWeight: labelMark.attrs.fontWeight,
      })
      const nodeMarginConfig: Partial<LayoutNodeOption> = {}
      if (symbolDef && symbolDef.symbolMargin) {
        Object.assign(nodeMarginConfig, {
          marginl: symbolDef.symbolMargin.left,
          marginr: symbolDef.symbolMargin.right,
          margint: symbolDef.symbolMargin.top,
          marginb: symbolDef.symbolMargin.bottom,
        })
      }

      const groupMinWidth = labelTextDims.width + 10
      const group = makeMark(
        'group',
        {},
        {
          children: compact([labelMark, typeMark]),
          itemId,
        },
      )
      parentMark.children.unshift(group)

      return {
        id: groupId,
        minwidth: groupMinWidth,
        ...nodeMarginConfig,
        onLayout(data: LayoutNode) {
          const { x, y, width, height } = data
          const containerWidth = Math.max(width, labelTextDims.width + 10)
          const node = data as LayoutNode<NodeExtra>
          if (bgMark && bgMark.type === 'rect') {
            safeAssign(bgMark.attrs, { x: x - containerWidth / 2, y: y - height / 2, width: containerWidth, height })
            group.children.unshift(bgMark)
          } else {
            const contentArea = { ...data, width: Math.max(data.width, containerWidth) }
            bgMark = symbolRegistry.create(groupType, {
              mode: 'container',
              contentArea,
              attrs: {
                fill: conf.groupBackground,
                stroke: conf.groupBorderColor,
                lineWidth: conf.groupBorderWidth,
              },
            })
            if (bgMark) {
              node.outerHeight = bgMark.symbolBounds.height
              node.outerWidth = bgMark.symbolBounds.width
              group.children.unshift(bgMark)
            }
          }

          const titleAnchorYOffset = labelTextDims.height + 5
          safeAssign(labelMark.attrs, { x, y: y - height / 2 + titleAnchorYOffset })
          setNodeExtra(node, 'titleAnchorYOffset', titleAnchorYOffset)

          if (typeMark) {
            const typeTextDims = calculateTextDimensions(typeText, fontConfig)
            safeAssign(typeMark.attrs, { x: x - containerWidth / 2 + 2, y: y + height / 2 - 2 - typeTextDims.height })
          }
        },
      }
    },

    makeRelationshipEdge(relationship: Relationship) {
      return createSvgRelationshipData(parentMark, relationship).edgeData
    },

    onSkippedRelationship(relationship: Relationship) {
      return createSvgRelationshipData(parentMark, relationship).skippedEdgeData
    },
  }
}

function createSvgRelationshipData(parentMark: Group, r: Relationship) {
  const lineMark = makeMark(
    'path',
    {
      path: [],
      stroke: conf.relationLineColor,
      lineCap: 'round',
    },
    { class: 'component__rel-line' },
  )
  if ([LineType.DOTTED_ARROW, LineType.DOTTED].includes(r.line.lineType)) {
    lineMark.attrs.lineDash = [4, 4]
  }
  let relText: Text | undefined
  let relTextBg: Rect | undefined
  let labelDims: TSize | undefined
  if (r.message) {
    labelDims = calculateTextDimensions(r.message, fontConfig)
    relText = makeMark(
      'text',
      {
        text: r.message,
        fill: conf.textColor,
        textAlign: 'center',
        textBaseline: 'middle',
        ...fontConfig,
      },
      { class: 'component__rel-text' },
    )
    relTextBg = makeLabelBg(labelDims, { x: 0, y: 0 }, { fill: conf.labelBackground })
  }

  const shouldDrawArrow = r.line.lineType !== LineType.STRAIGHT
  const relationGroupMark = makeMark(
    'group',
    {},
    {
      children: [lineMark, relTextBg, relText].filter(o => Boolean(o)),
    },
  )
  parentMark.children.push(relationGroupMark)

  const edgeData = {
    relationship: r,
    labelSize: labelDims,
    onLayout(data, context) {
      applyEdgeLayout({
        points: data.points,
        lineMark,
        relText,
        relTextBg,
        labelDims,
        shouldDrawArrow,
        relationGroupMark,
        updateBounds: context.updateBounds,
      })
    },
  } as EdgeData

  const skippedEdgeData: SkippedEdgeData = {
    relationship: r,
    lineMark,
    relationGroupMark,
    shouldDrawArrow,
    relText,
    relTextBg,
    labelDims,
  }

  return { edgeData, skippedEdgeData }
}

/**
 * Draw edges that were skipped in dagre layout (child-parent relationships).
 * These edges are calculated manually after layout using node positions.
 * For child -> parent edges, the arrow points to the parent's title label area.
 * Returns bounds for all label backgrounds to ensure they are included in final diagram bounds.
 */
function drawSkippedEdges(skippedEdges: SkippedEdgeData[], g: LayoutGraph): Bounds {
  const labelBounds = makeBounds()

  skippedEdges.forEach(edgeData => {
    const { relationship: r, lineMark, relationGroupMark, shouldDrawArrow, relText, relTextBg, labelDims } = edgeData

    // Get source and target node positions from dagre layout
    const fromNode = g.node(r.from.name) as LayoutNode
    const toNode = g.node(r.to.name) as LayoutNode

    if (!fromNode || !toNode) return

    const isToGroup = r.to.type === 'group'
    const isFromGroup = r.from.type === 'group'

    const fromCenter = { x: fromNode.x, y: fromNode.y }
    const toCenter = { x: toNode.x, y: toNode.y }

    // Calculate the half dimensions
    const toHalfHeight = (toNode.height || 0) / 2
    const fromHalfHeight = (fromNode.height || 0) / 2

    let startPoint: { x: number; y: number }
    let endPoint: { x: number; y: number }

    if (isToGroup) {
      // Child -> Parent: arrow points to parent group's title label (top of the group)
      // Use the stored title anchor offset calculated during drawGroupsTo
      const titleAnchorOffset = getNodeExtra(toNode, 'titleAnchorYOffset') || labelDims?.height || 15
      const titleY = toCenter.y - toHalfHeight + titleAnchorOffset

      startPoint = { x: fromCenter.x, y: fromCenter.y - fromHalfHeight }
      endPoint = { x: toCenter.x, y: titleY }
    } else if (isFromGroup) {
      // Parent -> Child: arrow comes from parent group's title area
      const titleAnchorOffset = getNodeExtra(fromNode, 'titleAnchorYOffset') || labelDims?.height || 15
      const titleY = fromCenter.y - fromHalfHeight + titleAnchorOffset

      startPoint = { x: fromCenter.x, y: titleY }
      endPoint = { x: toCenter.x, y: toCenter.y - toHalfHeight }
    } else {
      // Fallback (shouldn't happen for skipped edges)
      startPoint = { ...fromCenter }
      endPoint = { ...toCenter }
    }

    applyEdgeLayout({
      points: [startPoint, endPoint],
      lineMark,
      relText,
      relTextBg,
      labelDims,
      shouldDrawArrow,
      relationGroupMark,
      updateBounds: b => tryExpandBounds(labelBounds, b),
    })
  })

  return labelBounds
}

const adjustMarkInGraph = function (dagreWrapper: DagreWrapper) {
  dagreWrapper.callNodeOnLayout()

  const graph = dagreWrapper.g

  const labelBounds = makeBounds()
  const updateLabelBounds = b => {
    tryExpandBounds(labelBounds, b)
  }
  graph.edges().forEach(function (e) {
    const edgeData: LayoutEdge<EdgeData> = graph.edge(e)
    if (edgeData) {
      if (edgeData.onLayout) {
        edgeData.onLayout(edgeData, { updateBounds: updateLabelBounds })
      }
    }
  })
  return { labelBounds }
}

export default componentArtist
