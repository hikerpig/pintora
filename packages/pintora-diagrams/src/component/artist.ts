import {
  GraphicsIR,
  IDiagramArtist,
  Text,
  Group,
  safeAssign,
  calculateTextDimensions,
  PointTuple,
  Rect,
  TSize,
  getPointAt,
  symbolRegistry,
  GSymbol,
  mat3,
} from '@pintora/core'
import { ComponentDiagramIR, LineType, Relationship } from './db'
import { ComponentConf, getConf } from './config'
import { createLayoutGraph, getGraphBounds, LayoutEdge, LayoutGraph, LayoutNode, LayoutNodeOption } from '../util/graph'
import { makeMark, drawArrowTo, calcDirection, makeLabelBg } from '../util/artist-util'
import dagre from '@pintora/dagre'
import { Edge } from '@pintora/graphlib'

let conf: ComponentConf

function getEdgeName(relationship: Relationship) {
  return `${relationship.from.name}_${relationship.to.name}_${relationship.message}`
}

type EdgeData = {
  name: string
  relationship: Relationship
  onLayout(data: LayoutEdge<EdgeData>, edge: Edge): void
}

const componentArtist: IDiagramArtist<ComponentDiagramIR, ComponentConf> = {
  draw(ir) {
    // logger.info('[artist] component', ir)
    conf = getConf()

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
      edgesep: 20,
      ranksep: 60,
    })

    drawComponentsTo(rootMark, ir, g)
    drawInterfacesTo(rootMark, ir, g)

    drawGroupsTo(rootMark, ir, g)

    // add relationships
    drawRelationshipsTo(rootMark, ir, g)

    // do layout
    dagre.layout(g, {
      // debugTiming: true,
    })
    // ;(window as any).graph = g

    adjustMarkInGraph(g)

    const gBounds = getGraphBounds(g)

    const pad = conf.diagramPadding
    rootMark.matrix = mat3.fromTranslation(mat3.create(), [
      -Math.min(0, gBounds.left) + pad,
      -Math.min(0, gBounds.top) + pad,
    ])

    const width = gBounds.width + pad * 2
    const height = gBounds.height + pad * 2

    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
}

function drawComponentsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  const groups: Group[] = []
  const fontConfig = { fontSize: conf.fontSize }
  for (const component of Object.values(ir.components)) {
    const id = component.name
    const label = component.label || component.name
    const componentLabelDims = calculateTextDimensions(label || '', fontConfig as any)
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
  const fontConfig = { fontSize: conf.fontSize }
  for (const interf of Object.values(ir.interfaces)) {
    const id = interf.name
    const label = interf.label || interf.name
    const labelDims = calculateTextDimensions(label, fontConfig as any)
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
      const dummyBoxId = `${id}_pad`
      layoutNode.dummyBoxId = dummyBoxId
      g.setNode(dummyBoxId, {
        width: labelDims.width,
        height: nodeHeight,
        isDummy: true
      })
    }
  }
}

function drawGroupsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  for (const cGroup of Object.values(ir.groups)) {
    const groupId = cGroup.name
    const groupType = cGroup.groupType
    // console.log('[draw] group', cGroup)

    let bgMark: Rect | GSymbol
    let symbolDef = symbolRegistry.get(groupType)
    if (symbolDef) {
      // wait till onLayout
    } else {
      bgMark = makeMark(
        'rect',
        {
          fill: conf.groupBackground,
          stroke: conf.groupBorderColor,
          lineWidth: conf.lineWidth,
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
        fontWeight: 'bold',
        fontSize: conf.fontSize,
      },
      { class: 'component__group-rect' },
    )
    const typeText = `[${cGroup.groupType}]`
    const typeMark = makeMark(
      'text',
      {
        text: typeText,
        fill: conf.textColor,
        fontSize: conf.fontSize,
        textBaseline: 'hanging', // have to hack a little, otherwise label will collide with rect border in downloaded svg
      },
      { class: 'component__type' },
    )

    const labelTextDims = calculateTextDimensions(groupLabel)
    const typeTextDims = calculateTextDimensions(typeText)

    let nodeMargin = {}
    if (symbolDef && symbolDef.symbolMargin) {
      Object.assign(nodeMargin, {
        marginl: symbolDef.symbolMargin.left,
        marginr: symbolDef.symbolMargin.right,
        margint: symbolDef.symbolMargin.top,
        marginb: symbolDef.symbolMargin.bottom,
      })
    }

    g.setNode(groupId, {
      id: groupId,
      ...nodeMargin,
      onLayout(data: LayoutNode) {
        const { x, y, width, height } = data
        const containerWidth = Math.max(width, labelTextDims.width + 10)
        // console.log('[group] onLayout', data, 'containerWidth', containerWidth)
        if (bgMark && bgMark.type === 'rect') {
          safeAssign(bgMark.attrs, { x: x - containerWidth / 2, y: y - height / 2, width: containerWidth, height })
          group.children.unshift(bgMark)
        } else {
          bgMark = symbolRegistry.create(groupType, {
            contentArea: data,
            attrs: {
              fill: conf.groupBackground,
              stroke: conf.groupBorderColor,
              lineWidth: conf.lineWidth,
            },
          })
          if (bgMark) {
            // console.log('bgMark', groupId, bgMark, 'bounds', bgMark.symbolBounds)
            const node: LayoutNode = g.node(groupId)
            node.outerTop = bgMark.symbolBounds.top + y
            node.outerBottom = bgMark.symbolBounds.bottom + y
            node.outerLeft = bgMark.symbolBounds.left + x
            node.outerRight = bgMark.symbolBounds.right + x
            node.outerHeight = bgMark.symbolBounds.height
            node.outerWidth = bgMark.symbolBounds.width
            group.children.unshift(bgMark)
          }
        }
        safeAssign(labelMark.attrs, { x, y: y - height / 2 + labelTextDims.height + 5 })
        safeAssign(typeMark.attrs, { x: x - containerWidth / 2 + 2, y: y + height / 2 - 2 - typeTextDims.height })
      },
    })
    for (const child of cGroup.children) {
      if ('name' in child) {
        const childNode: LayoutNodeOption = g.node(child.name)
        if (childNode) {
          g.setParent(childNode.id, groupId)

          // TODO: should enable this, and assign all `node.margin*`s
          // if (childNode.dummyBoxId) {
          //   g.setParent(childNode.id, childNode.dummyBoxId)
          //   g.setParent(childNode.dummyBoxId, groupId)
          // }
        }
      }
    }

    const group = makeMark(
      'group',
      {},
      {
        children: [labelMark, typeMark],
      },
    )
    parentMark.children.unshift(group)
  }
}

function drawRelationshipsTo(parentMark: Group, ir: ComponentDiagramIR, g: LayoutGraph) {
  ir.relationships.forEach(function (r) {
    const lineMark = makeMark(
      'polyline',
      {
        points: [],
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
      labelDims = calculateTextDimensions(r.message)
      relText = makeMark(
        'text',
        {
          text: r.message,
          fill: conf.textColor,
          textAlign: 'center',
          textBaseline: 'middle',
          fontSize: conf.fontSize,
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
      labeloffset: 100,
      onLayout(data, edge) {
        // console.log('edge onlayout', data, 'points', data.points.map(t => `${t.x},${t.y}`))
        const points = data.points.map(p => [p.x, p.y]) as PointTuple[]
        lineMark.attrs.points = points
        if (relText) {
          // do not choose 0.5, otherwise label would probably cover other nodes
          const anchorPoint = getPointAt(data.points, 0.4, true)
          safeAssign(relText.attrs, { x: anchorPoint.x + labelDims.width / 2, y: anchorPoint.y })
          safeAssign(relTextBg.attrs, { x: anchorPoint.x, y: anchorPoint.y - labelDims.height / 2 })
        }

        if (shouldDrawArrow) {
          const lastPoint = data.points[data.points.length - 1]
          const pointsForDirection = data.points.slice(-2)
          const arrowRad = calcDirection.apply(null, pointsForDirection)
          const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
            stroke: conf.relationLineColor,
            fill: conf.relationLineColor,
          })
          // arrowMark.class = 'component__rel-arrow'
          relationGroupMark.children.push(arrowMark)
        }
      },
    } as EdgeData)

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

const adjustMarkInGraph = function (graph: LayoutGraph) {
  // console.log('adjustMarkInGraphNodes', graph)
  graph.nodes().forEach(function (v) {
    const nodeData = graph.node(v)
    if (nodeData) {
      if (nodeData.onLayout) {
        nodeData.onLayout(nodeData)
      }
    }
  })

  graph.edges().forEach(function (e) {
    const edgeData: LayoutEdge<EdgeData> = graph.edge(e)
    if (edgeData?.onLayout) {
      edgeData.onLayout(edgeData, e)
    }
  })
}

export default componentArtist
