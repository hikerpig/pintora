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
import { ComponentDiagramIR, LineType, Relationship } from './db'
import { ComponentConf, getConf } from './config'
import {
  createLayoutGraph,
  getGraphSplinesOption,
  LayoutEdge,
  LayoutGraph,
  LayoutNode,
  LayoutNodeOption,
} from '../util/graph'
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

let conf: ComponentConf
let fontConfig: IFont

function getEdgeName(relationship: Relationship) {
  return `${relationship.from.name}_${relationship.to.name}_${relationship.message}`
}

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

    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    }).setGraph({
      nodesep: 20,
      edgesep: conf.edgesep,
      ranksep: conf.ranksep,
      splines: getGraphSplinesOption(conf.edgeType),
      avoid_label_on_border: true,
    })

    const dagreWrapper = new DagreWrapper(g)

    drawComponentsTo(rootMark, ir, g)
    drawInterfacesTo(rootMark, ir, g)

    drawGroupsTo(rootMark, ir, g)

    // add relationships
    const { skippedEdges } = drawRelationshipsTo(rootMark, ir, g)

    dagreWrapper.doLayout()

    const { labelBounds } = adjustMarkInGraph(dagreWrapper)

    // Draw manually the edges that were skipped (child-parent relationships)
    const skippedEdgeBounds = drawSkippedEdges(skippedEdges, g)

    // Merge all bounds: graph bounds, regular edge label bounds, and skipped edge bounds
    const gBounds = tryExpandBounds(tryExpandBounds(dagreWrapper.getGraphBounds(), labelBounds), skippedEdgeBounds)
    const pad = conf.diagramPadding

    const titleFont: IFont = fontConfig
    const titleMaker = new DiagramTitleMaker({
      title: ir.title,
      titleFont,
      fill: conf.textColor,
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
    } as GraphicsIR
  }
}
const componentArtist = new ComponentArtist()

function drawComponentsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  const groups: Group[] = []
  for (const component of Object.values(ir.components)) {
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
    groups.push(group)
    parentMark.children.push(group)

    g.setNode(id, {
      width: compWidth,
      height: compHeight,
      id,
      onLayout(data: LayoutNode) {
        const { x, y } = data // the center of the node
        safeAssign(rectMark.attrs, { x: x - compWidth / 2, y: y - compHeight / 2 })
        safeAssign(textMark.attrs, { x, y })
      },
    })
  }
}

function drawInterfacesTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  const groups: Group[] = []
  for (const interf of Object.values(ir.interfaces)) {
    const id = interf.name
    const itemId = interf.itemId
    const label = interf.label || interf.name
    const labelDims = calculateTextDimensions(label, fontConfig)
    const interfaceSize = conf.interfaceSize
    const circleMark = makeMark(
      'circle',
      {
        cx: 0,
        cy: 0,
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
    groups.push(group)
    parentMark.children.push(group)

    const outerWidth = Math.max(interfaceSize, labelDims.width)
    const nodeHeight = interfaceSize + labelDims.height
    const layoutNode: LayoutNodeOption = {
      width: interfaceSize,
      height: nodeHeight,
      id,
      outerWidth,
      onLayout(data: LayoutNode) {
        const { x, y } = data // the center of the node
        safeAssign(circleMark.attrs, { cx: x, cy: y - labelDims.height / 2 + 2 })
        safeAssign(textMark.attrs, { x, y: y + 2 })
      },
    }

    g.setNode(id, layoutNode)

    if (labelDims.width > interfaceSize) {
      const marginH = (labelDims.width - interfaceSize) / 2
      layoutNode.marginl = marginH
      layoutNode.marginr = marginH
    }
  }
}

function drawGroupsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  for (const cGroup of Object.values(ir.groups)) {
    const groupId = cGroup.name
    const itemId = cGroup.itemId
    const groupType = cGroup.groupType
    // console.log('[draw] group', cGroup)

    let bgMark: Rect | GSymbol
    const symbolDef = symbolRegistry.get(groupType)
    if (symbolDef) {
      // wait till onLayout
    } else {
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
          textBaseline: 'hanging', // have to hack a little, otherwise label will collide with rect border in downloaded svg
        },
        { class: 'component__type' },
      )
    }

    const labelTextDims = calculateTextDimensions(groupLabel, { ...fontConfig, fontWeight: labelMark.attrs.fontWeight })

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

    g.setNode(groupId, {
      id: groupId,
      minwidth: groupMinWidth,
      ...nodeMarginConfig,
      onLayout(data: LayoutNode) {
        const { x, y, width, height } = data
        const containerWidth = Math.max(width, labelTextDims.width + 10)
        // console.log('[group] onLayout', data, 'containerWidth', containerWidth)
        const node = g.node(groupId) as unknown as LayoutNode
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
            // console.log('bgMark', groupId, bgMark, 'bounds', bgMark.symbolBounds)
            // node.outerTop = bgMark.symbolBounds.top + y
            // node.outerBottom = bgMark.symbolBounds.bottom + y
            // node.outerLeft = bgMark.symbolBounds.left + x
            // node.outerRight = bgMark.symbolBounds.right + x
            node.outerHeight = bgMark.symbolBounds.height
            node.outerWidth = bgMark.symbolBounds.width
            group.children.unshift(bgMark)
          }
        }

        const titleAnchorYOffset = labelTextDims.height + 5
        safeAssign(labelMark.attrs, { x, y: y - height / 2 + titleAnchorYOffset })
        // Store the title anchor offset for use by skipped edges (child->parent connections)
        setNodeExtra(node, 'titleAnchorYOffset', titleAnchorYOffset)

        if (typeMark) {
          const typeTextDims = calculateTextDimensions(typeText, fontConfig)
          safeAssign(typeMark.attrs, { x: x - containerWidth / 2 + 2, y: y + height / 2 - 2 - typeTextDims.height })
        }

        // debug
        // const centerMark = makeCircleWithCoordInPoint(data)
        // const leftMark = makeCircleWithCoordInPoint({ ...data, x: data.x - containerWidth / 2 })
        // const rightMark = makeCircleWithCoordInPoint({ ...data, x: data.x + containerWidth / 2 })
        // const topMark = makeCircleWithCoordInPoint({ ...data, y: data.y - data.height / 2 })
        // const bottomMark = makeCircleWithCoordInPoint({ ...data, y: data.y + data.height / 2 })
        // group.children.push(centerMark, leftMark, rightMark)
        // group.children.push(centerMark, topMark, bottomMark)
      },
    })

    for (const child of cGroup.children) {
      if ('name' in child) {
        const childNode: LayoutNodeOption = g.node(child.name)
        if (childNode) {
          g.setParent(childNode.id, groupId)

          if (childNode.dummyBoxId) {
            g.setParent(childNode.id, childNode.dummyBoxId)
            g.setParent(childNode.dummyBoxId, groupId)
          }
        }
      }
    }

    const group = makeMark(
      'group',
      {},
      {
        children: compact([labelMark, typeMark]),
        itemId,
      },
    )
    parentMark.children.unshift(group)
  }
}

function drawRelationshipsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  // Helper function to check if a node is a child (direct or nested) of a group
  const isChildOfGroup = (nodeName: string, groupName: string): boolean => {
    const group = ir.groups[groupName]
    if (!group) return false

    // Check direct children first
    const isDirectChild = group.children.some(child => 'name' in child && child.name === nodeName)
    if (isDirectChild) return true

    // Recursively check nested groups - handles grandchild -> ancestor relationships
    for (const child of group.children) {
      if ('name' in child && child.name in ir.groups) {
        if (isChildOfGroup(nodeName, child.name)) return true
      }
    }

    return false
  }

  const skippedEdges: SkippedEdgeData[] = []

  ir.relationships.forEach(function (r) {
    // console.log('draw relationship', r)
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

    const isFromGroup = r.from.type === 'group'
    const isToGroup = r.to.type === 'group'

    // Check for problematic parent-child relationships that would cause dagre to hang
    // When a child component connects to its parent group (or vice versa), dagre cannot
    // handle this in compound graph layout - it causes an infinite loop
    const isSourceChildOfTarget = isToGroup && isChildOfGroup(r.from.name, r.to.name)
    const isTargetChildOfSource = isFromGroup && isChildOfGroup(r.to.name, r.from.name)
    const shouldSkipEdge = isSourceChildOfTarget || isTargetChildOfSource

    if (shouldSkipEdge) {
      // Increase the child node's top margin to make room for the edge
      // that will connect to the parent group's title area
      if (isSourceChildOfTarget) {
        const childNode = g.node(r.from.name)
        if (childNode) {
          childNode.margint = Math.min((childNode.margint || 0) + 20, 40)
        }
      } else if (isTargetChildOfSource) {
        const childNode = g.node(r.to.name)
        if (childNode) {
          childNode.margint = Math.min((childNode.margint || 0) + 20, 40)
        }
      }
    }

    const shouldDrawArrow = r.line.lineType !== LineType.STRAIGHT

    const relationGroupMark = makeMark(
      'group',
      {},
      {
        children: [lineMark, relTextBg, relText].filter(o => Boolean(o)),
      },
    )

    // Only add edge to dagre if it's not a problematic parent-child relationship
    if (!shouldSkipEdge) {
      g.setEdge(r.from.name, r.to.name, {
        name: getEdgeName(r),
        relationship: r,
        labelpos: 'r',
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
      } as EdgeData)

      // Add dummy edges for group connections (but only if not a problematic relationship)
      if (isFromGroup || isToGroup) {
        if (isToGroup) {
          const toGroup = ir.groups[r.to.name]
          const firstChild = toGroup?.children[0]
          if (firstChild && 'name' in firstChild && firstChild.name !== r.from.name) {
            if (!isChildOfGroup(r.from.name, r.to.name)) {
              g.setEdge(r.from.name, firstChild.name, { isDummyEdge: true } as EdgeData)
            }
          }
        } else if (isFromGroup) {
          const fromGroup = ir.groups[r.from.name]
          const firstChild = fromGroup?.children[0]
          if (firstChild && 'name' in firstChild && firstChild.name !== r.to.name) {
            if (!isChildOfGroup(r.to.name, r.from.name)) {
              g.setEdge(firstChild.name, r.to.name, { isDummyEdge: true } as EdgeData)
            }
          }
        }
      }
    } else {
      // Collect skipped edges for manual drawing after layout
      skippedEdges.push({
        relationship: r,
        lineMark,
        relationGroupMark,
        shouldDrawArrow,
        relText,
        relTextBg,
        labelDims,
      })
    }

    parentMark.children.push(relationGroupMark)
  })

  return { skippedEdges }
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
