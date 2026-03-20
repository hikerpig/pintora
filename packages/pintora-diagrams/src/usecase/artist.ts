import {
  getPointAt,
  Group,
  IFont,
  mat3,
  PathCommand,
  Point,
  safeAssign,
  Text,
  type DiagramArtistOptions,
  type GraphicsIR,
} from '@pintora/core'
import {
  adjustRootMarkBounds,
  calcDirection,
  DiagramTitleMaker,
  getBaseText,
  makeEmptyGroup,
  makeLabelBg,
  makeMark,
  drawArrowTo,
} from '../util/artist-util'
import { calcBound, updateBoundsByPoints } from '../util/bound'
import { DagreWrapper } from '../util/dagre-wrapper'
import { getFontConfig } from '../util/font-config'
import { BaseEdgeData, createLayoutGraph, getGraphSplinesOption, LayoutGraph } from '../util/graph'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, tryExpandBounds } from '../util/mark-positioner'
import { toFixed } from '../util/number'
import { getTextDimensionsInPresicion } from '../util/text'
import { UseCaseConf, getConf } from './config'
import { Actor, UseCase, UseCaseDiagramIR, Relation, RelationType } from './db'
import { BaseArtist } from '../util/base-artist'
import type { EnhancedConf } from '../util/config'

let conf: EnhancedConf<UseCaseConf>

class UseCaseArtist extends BaseArtist<UseCaseDiagramIR, UseCaseConf> {
  customDraw(ir: UseCaseDiagramIR, config?: UseCaseConf, opts?: DiagramArtistOptions): GraphicsIR {
    conf = getConf(ir, config)

    const rootMark: Group = {
      type: 'group',
      attrs: {},
      children: [],
    }

    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    })
      .setGraph({
        rankdir: conf.layoutDirection,
        nodesep: conf.nodesep,
        edgesep: conf.edgesep,
        ranksep: conf.ranksep,
        splines: getGraphSplinesOption(conf.edgeType),
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })

    const dagreWrapper = new DagreWrapper(g)

    drawActors(rootMark, ir, g)
    drawUseCases(rootMark, ir, g)
    drawSystemBoundaries(rootMark, ir, g)

    const relations = addRelations(ir.relations, g)

    dagreWrapper.doLayout()

    dagreWrapper.callNodeOnLayout()
    dagreWrapper.callEdgeOnLayout()

    const relationsGroup: Group = {
      type: 'group',
      children: [],
      class: 'usecase__relations',
    }
    const relationshipsBounds = makeBounds()
    relations.forEach(function (rel) {
      const { bounds: relationBounds } = drawRelationFromLayout(relationsGroup, rel, g)
      tryExpandBounds(relationshipsBounds, relationBounds)
    })
    rootMark.children.unshift(relationsGroup)

    const bounds = dagreWrapper.getGraphBounds()
    tryExpandBounds(bounds, relationshipsBounds)

    const pad = conf.diagramPadding

    const titleFont: IFont = getFontConfig(conf)
    const titleMaker = new DiagramTitleMaker({
      title: ir.title,
      titleFont,
      theme: conf.themeConfig.themeVariables,
      className: 'usecase__title',
    })
    const titleResult = titleMaker.appendTitleMark(rootMark)

    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds: bounds,
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
    }
  }
}
const useCaseArtist = new UseCaseArtist()

function drawActorShape(group: Group, centerX: number, centerY: number) {
  const actorWidth = conf.actorWidth
  const actorHeight = conf.actorHeight

  // Head circle
  const headRadius = actorWidth * 0.2
  const headY = centerY - actorHeight * 0.3
  group.children.push(
    makeMark('circle', {
      x: centerX,
      y: headY,
      r: headRadius,
      stroke: conf.actorStroke,
      fill: conf.actorFill,
    }),
  )

  // Body line
  const bodyStartY = headY + headRadius
  const bodyEndY = centerY + actorHeight * 0.1
  group.children.push(
    makeMark('line', {
      x1: centerX,
      y1: bodyStartY,
      x2: centerX,
      y2: bodyEndY,
      stroke: conf.actorStroke,
    }),
  )

  // Arms
  const armLength = actorWidth * 0.4
  const armY = centerY - actorHeight * 0.05
  group.children.push(
    makeMark('line', {
      x1: centerX - armLength,
      y1: armY,
      x2: centerX + armLength,
      y2: armY,
      stroke: conf.actorStroke,
    }),
  )

  // Legs
  const legLength = actorHeight * 0.3
  const legStartY = bodyEndY
  const legSpread = actorWidth * 0.25
  group.children.push(
    makeMark('line', {
      x1: centerX,
      y1: legStartY,
      x2: centerX - legSpread,
      y2: legStartY + legLength,
      stroke: conf.actorStroke,
    }),
  )
  group.children.push(
    makeMark('line', {
      x1: centerX,
      y1: legStartY,
      x2: centerX + legSpread,
      y2: legStartY + legLength,
      stroke: conf.actorStroke,
    }),
  )
}

const drawActors = function (rootMark: Group, ir: UseCaseDiagramIR, graph: LayoutGraph) {
  const keys = Object.keys(ir.actors)

  keys.forEach(function (id) {
    const actor = ir.actors[id]
    const itemId = actor.itemId
    const group = makeMark(
      'group',
      {
        id,
      },
      { children: [], class: 'usecase__actor', itemId },
    )

    const fontConfig = getFontConfig(conf)
    const label = actor.label || actor.name
    const textDims = getTextDimensionsInPresicion(label, fontConfig)

    const actorWidth = Math.max(conf.actorWidth, textDims.width + conf.actorPaddingX * 2)
    const actorHeight = conf.actorHeight + textDims.height + conf.actorPaddingY

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...textDims,
        text: label,
        id: itemId,
        textAlign: 'center',
        textBaseline: 'top',
        fill: conf.textColor,
        ...fontConfig,
      },
      { class: 'usecase__actor-label' },
    )

    group.children.push(textMark)

    graph.setNode(id, {
      width: actorWidth,
      height: actorHeight,
      id,
      onLayout(data) {
        const x = Math.floor(data.x)
        const y = Math.floor(data.y)

        drawActorShape(group, x, y - textDims.height / 2 - conf.actorPaddingY / 2)

        safeAssign(textMark.attrs, {
          x: x,
          y: y + actorHeight / 2 - textDims.height - conf.actorPaddingY / 2,
        })
      },
    })

    rootMark.children.push(group)
  })
}

const drawUseCases = function (rootMark: Group, ir: UseCaseDiagramIR, graph: LayoutGraph) {
  const keys = Object.keys(ir.useCases)

  keys.forEach(function (id) {
    const useCase = ir.useCases[id]
    const itemId = useCase.itemId
    const group = makeMark(
      'group',
      {
        id,
      },
      { children: [], class: 'usecase__usecase', itemId },
    )

    const fontConfig = getFontConfig(conf)
    const label = useCase.label || useCase.name
    const textDims = getTextDimensionsInPresicion(label, fontConfig)

    const useCaseWidth = textDims.width + conf.useCasePaddingX * 2
    const useCaseHeight = textDims.height + conf.useCasePaddingY * 2

    const ellipseMark = makeMark(
      'ellipse',
      {
        cx: 0,
        cy: 0,
        rx: useCaseWidth / 2,
        ry: useCaseHeight / 2,
        fill: conf.useCaseFill,
        stroke: conf.useCaseStroke,
      },
      { class: 'usecase__usecase-ellipse' },
    )

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...textDims,
        text: label,
        id: itemId,
        textAlign: 'center',
        textBaseline: 'middle',
        fill: conf.textColor,
        ...fontConfig,
      },
      { class: 'usecase__usecase-label' },
    )

    group.children.push(ellipseMark, textMark)

    graph.setNode(id, {
      width: useCaseWidth,
      height: useCaseHeight,
      id,
      onLayout(data) {
        const x = Math.floor(data.x)
        const y = Math.floor(data.y)

        safeAssign(ellipseMark.attrs, { cx: x, cy: y })
        safeAssign(textMark.attrs, { x: x, y: y })
      },
    })

    rootMark.children.push(group)
  })
}

const drawSystemBoundaries = function (rootMark: Group, ir: UseCaseDiagramIR, graph: LayoutGraph) {
  const keys = Object.keys(ir.systemBoundaries)

  keys.forEach(function (id) {
    const systemBoundary = ir.systemBoundaries[id]
    const itemId = systemBoundary.itemId
    const label = systemBoundary.label || systemBoundary.name

    const fontConfig = getFontConfig(conf, { fontWeight: 'bold' })
    const labelDims = getTextDimensionsInPresicion(label, fontConfig)

    const rectMark = makeMark(
      'rect',
      {
        fill: conf.systemBoundaryFill,
        stroke: conf.systemBoundaryStroke,
        radius: conf.borderRadius,
      },
      { class: 'usecase__system-boundary-rect' },
    )

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...labelDims,
        text: label,
        id: itemId,
        textAlign: 'center',
        textBaseline: 'top',
        fill: conf.textColor,
        ...fontConfig,
      },
      { class: 'usecase__system-boundary-label' },
    )

    const group = makeMark('group', {}, { children: [], class: 'usecase__system-boundary', itemId })

    // Calculate minimum width for the system boundary
    const minWidth = labelDims.width + conf.systemBoundaryPadding * 2

    graph.setNode(id, {
      id,
      minwidth: minWidth,
      onLayout(data) {
        const { x, y, width, height } = data
        const containerWidth = Math.max(width, minWidth)

        // Position the boundary rectangle
        safeAssign(rectMark.attrs, {
          x: x - containerWidth / 2,
          y: y - height / 2,
          width: containerWidth,
          height,
        })
        group.children.unshift(rectMark)

        // Position the label at the top of the boundary
        safeAssign(textMark.attrs, {
          x,
          y: y - height / 2 + conf.systemBoundaryPadding,
        })
      },
    })

    // Add use cases to the system boundary
    systemBoundary.useCases.forEach(useCaseName => {
      const useCaseNode = graph.node(useCaseName)
      if (useCaseNode) {
        graph.setParent(useCaseName, id)
      }
    })

    group.children.push(textMark)
    rootMark.children.unshift(group)
  })
}

type EdgeData = BaseEdgeData & {
  relation: Relation
  onLayout(data: EdgeData): void
}

const addRelations = function (relations: UseCaseDiagramIR['relations'], g: LayoutGraph) {
  relations.forEach(function (r) {
    g.setEdge(r.from, r.to, { relation: r } as EdgeData)
  })
  return relations
}

let relCnt = 0
const drawRelationFromLayout = function (group: Group, rel: Relation, g: LayoutGraph) {
  relCnt++

  const bounds = makeBounds()

  const edge: EdgeData = g.edge(rel.from, rel.to)
  if (!('relation' in edge)) return { bounds }

  const [startPoint, ...restPoints] = edge.points
  const secondPoint = restPoints[0]
  const lastPoint = restPoints[restPoints.length - 1]
  updateBoundsByPoints(bounds, edge.points)

  let pathCommands: PathCommand[] | string
  if (conf.edgeType === 'curved') {
    const pathString = getPointsCurvePath(edge.points)
    pathCommands = pathString
  } else {
    pathCommands = getPointsLinearPath(edge.points)
  }

  const itemId = rel.itemId
  const linePath = makeMark(
    'path',
    {
      path: pathCommands,
      stroke: conf.edgeColor,
      lineJoin: 'round',
      lineDash: rel.type === RelationType.INCLUDE || rel.type === RelationType.EXTEND ? [2, 2] : null,
    },
    { itemId },
  )

  group.children.push(linePath)

  // 处理不同类型关系的箭头
  if (rel.type === RelationType.ASSOCIATION || rel.type === RelationType.INCLUDE || rel.type === RelationType.EXTEND) {
    const endMarkerDirection = calcDirection(restPoints[restPoints.length - 1], restPoints[restPoints.length - 2])
    const endMarker = drawArrowTo(lastPoint, 10, endMarkerDirection + Math.PI, {
      color: conf.edgeColor,
      type: 'triangle',
    })
    if (endMarker) {
      group.children.push(endMarker)
    }
  } else if (rel.type === RelationType.GENERALIZATION) {
    const endMarkerDirection = calcDirection(restPoints[restPoints.length - 1], restPoints[restPoints.length - 2])
    const endMarker = drawArrowTo(lastPoint, 10, endMarkerDirection + Math.PI, {
      color: conf.edgeColor,
      type: 'etriangle',
    })
    if (endMarker) {
      group.children.push(endMarker)
    }
  }

  if (rel.label) {
    const labelPoint = edge.labelPoint || getPointAt(edge.points, 0.5, true)
    const labelX = labelPoint.x
    const labelY = labelPoint.y

    const fontConfig = getFontConfig(conf)
    const labelDims = getTextDimensionsInPresicion(rel.label, fontConfig)
    labelDims.width += conf.fontSize / 2
    labelDims.height += conf.fontSize / 2

    const labelBg = makeLabelBg(labelDims, { x: labelX, y: labelY }, { fill: conf.labelBackground })
    const labelBgBound = calcBound([labelBg])
    tryExpandBounds(bounds, labelBgBound)

    const labelMark = makeMark(
      'text',
      {
        text: rel.label,
        textAlign: 'center',
        textBaseline: 'middle',
        x: labelX,
        y: labelY,
        fill: conf.textColor,
        ...fontConfig,
      },
      { itemId, class: 'usecase__relation-label' },
    )

    group.children.push(labelBg, labelMark)
  }

  return { bounds }
}

export default useCaseArtist
