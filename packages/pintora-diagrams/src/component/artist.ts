import {
  GraphicsIR,
  IDiagramArtist,
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
    drawRelationshipsTo(rootMark, ir, g)

    dagreWrapper.doLayout()

    const { labelBounds } = adjustMarkInGraph(dagreWrapper)
    const gBounds = tryExpandBounds(dagreWrapper.getGraphBounds(), labelBounds)
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
        x: 0,
        y: 0,
        r: interfaceSize / 2,
        fill: conf.componentBackground,
        stroke: conf.componentBorderColor,
        lineWidth: conf.lineWidth,
      },
      { class: 'component__interface' },
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
        class: 'component__group',
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
        safeAssign(circleMark.attrs, { x, y: y - labelDims.height / 2 + 2 })
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

        safeAssign(labelMark.attrs, { x, y: y - height / 2 + labelTextDims.height + 5 })

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
    let relText: Text
    let relTextBg: Rect
    let labelDims: TSize
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
    g.setEdge(r.from.name, r.to.name, {
      name: getEdgeName(r),
      relationship: r,
      labelpos: 'r',
      // labeloffset: 100,
      labelSize: labelDims,
      onLayout(data, context) {
        // console.log(
        //   'edge onLayout',
        //   edge,
        //   data,
        //   'points',
        //   data.points.map(t => `${t.x},${t.y}`),
        // )
        const newPath = conf.edgeType === 'curved' ? getPointsCurvePath(data.points) : getPointsLinearPath(data.points)
        lineMark.attrs.path = newPath
        if (relText) {
          // do not choose 0.5, otherwise label would probably cover other nodes
          const anchorPoint = data.labelPoint || getPointAt(data.points, 0.4, true)
          safeAssign(relText.attrs, { x: anchorPoint.x, y: anchorPoint.y })
          safeAssign(relTextBg.attrs, {
            x: anchorPoint.x - labelDims.width / 2,
            y: anchorPoint.y - labelDims.height / 2,
          })
          const bgAttrs = relTextBg.attrs
          context.updateBounds({
            left: bgAttrs.x,
            right: bgAttrs.x + bgAttrs.width,
            top: bgAttrs.y,
            bottom: bgAttrs.y + bgAttrs.height,
            width: bgAttrs.width,
            height: bgAttrs.height,
          })
          // // debug
          // const labelPointMark = makeCircleWithCoordInPoint(anchorPoint)
          // relationGroupMark.children.push(labelPointMark)
        }

        if (shouldDrawArrow) {
          const lastPoint = data.points[data.points.length - 1]
          const pointsForDirection = data.points.slice(-2)
          const arrowRad = calcDirection.apply(null, pointsForDirection)
          const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
            color: conf.relationLineColor,
          })
          relationGroupMark.children.push(arrowMark)
        }
      },
    } as EdgeData)

    const isFromGroup = r.from.type === 'group'
    const isToGroup = r.to.type === 'group'
    if (isFromGroup || isToGroup) {
      if (isToGroup) {
        const toGroup = ir.groups[r.to.name]
        const firstChild = toGroup?.children[0]
        if (firstChild && 'name' in firstChild) {
          g.setEdge(r.from.name, firstChild.name, { isDummyEdge: true } as EdgeData)
        }
      } else if (isFromGroup) {
        const fromGroup = ir.groups[r.from.name]
        const firstChild = fromGroup?.children[0]
        if (firstChild && 'name' in firstChild) g.setEdge(firstChild.name, r.to.name, { isDummyEdge: true } as EdgeData)
      }
    }

    const relationGroupMark = makeMark(
      'group',
      {},
      {
        children: [lineMark, relTextBg, relText].filter(o => Boolean(o)),
      },
    )

    parentMark.children.push(relationGroupMark)
  })
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
