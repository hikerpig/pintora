import {
  getPointAt,
  Group,
  IDiagramArtist,
  IFont,
  mat3,
  PathCommand,
  Point,
  Rect,
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
  makeTriangle,
} from '../util/artist-util'
import { calcBound, updateBoundsByPoints } from '../util/bound'
import { DagreWrapper } from '../util/dagre-wrapper'
import { getFontConfig } from '../util/font-config'
import { BaseEdgeData, createLayoutGraph, getGraphSplinesOption, LayoutGraph } from '../util/graph'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, positionGroupContents, tryExpandBounds } from '../util/mark-positioner'
import { toFixed } from '../util/number'
import { styleEngine } from '../util/style-engine'
import { getTextDimensionsInPresicion } from '../util/text'
import { CELL_ORDER, CellName, drawMarkerTo, TableBuilder, TableCell, TableRow } from './artist-util'
import { ErConf, getConf } from './config'
import { Entity, ErDiagramIR, Identification, Relationship } from './db'
import { BaseArtist } from '../util/base-artist'

let conf: ErConf

class ErArtist extends BaseArtist<ErDiagramIR, ErConf> {
  customDraw(ir: ErDiagramIR, config?: ErConf, opts?: DiagramArtistOptions): GraphicsIR {
    conf = getConf(ir)
    // Now we have to construct the diagram in a specific way:
    // ---
    // 1. Create all the entities in the svg node at 0,0, but with the correct dimensions (allowing for text content)
    // 2. Make sure they are all added to the graph
    // 3. Add all the edges (relationships) to the graph aswell
    // 4. Let dagre do its magic to layout the graph.  This assigns:
    //    - the centre co-ordinates for each node, bearing in mind the dimensions and edge relationships
    //    - the path co-ordinates for each edge
    //    But it has no impact on the svg child nodes - the diagram remains with every entity rooted at 0,0
    // 5. Now assign a transform to each entity in the svg node so that it gets drawn in the correct place, as determined by
    //    its centre point, which is obtained from the graph, and it's width and height
    // 6. And finally, create all the edges in the svg node using information from the graph
    // ---

    const rootMark: Group = {
      type: 'group',
      attrs: {},
      children: [],
    }

    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: false,
    })
      .setGraph({
        rankdir: conf.layoutDirection,
        nodesep: 80,
        edgesep: conf.edgesep,
        ranksep: conf.ranksep,
        splines: getGraphSplinesOption(conf.edgeType),
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })

    const dagreWrapper = new DagreWrapper(g)

    drawEntities(rootMark, ir, g)

    // Add all the relationships to the graph
    const relationships = addRelationships(ir.relationships, g)

    drawInheritances(ir, g, rootMark)

    dagreWrapper.doLayout()

    // Adjust the positions of the entities so that they adhere to the layout
    dagreWrapper.callNodeOnLayout()
    dagreWrapper.callEdgeOnLayout()

    const relationsGroup: Group = {
      type: 'group',
      children: [],
      class: 'er__relations',
    }
    const relationshipsBounds = makeBounds()
    // Draw the relationships
    relationships.forEach(function (rel) {
      const { bounds: relationBounds } = drawRelationshipFromLayout(relationsGroup, rel, g)
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
      fill: conf.textColor,
      className: 'er__title',
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
const erArtist = new ErArtist()

/**
 * Draw attributes for an entity
 */
const drawAttributes = (group: Group, entityText: Text, attributes: Entity['attributes']) => {
  const attribPaddingY = conf.entityPaddingY / 2 // Padding internal to attribute boxes
  const attribPaddingX = conf.entityPaddingX / 2 // Ditto
  const attrFontSize = conf.fontSize * 0.85
  const labelBBox = { width: Math.ceil(entityText.attrs.width), height: Math.ceil(entityText.attrs.height) }
  let maxRowContentWidth = 0
  let cumulativeHeight = labelBBox.height + attribPaddingY * 2
  let attrNum = 1

  const attributeGroup = makeEmptyGroup()
  group.children.push(attributeGroup)

  const tableBuilder = new TableBuilder()

  attributes.forEach(item => {
    const attrPrefix = `${entityText.attrs.id}-attr-${attrNum}`

    const makeLabelTextMark = (name: CellName, text: string) => {
      return makeMark(
        'text',
        {
          ...getTextDimensionsInPresicion(text, fontConfig),
          ...getBaseText(),
          id: `${attrPrefix}-${name}`,
          text: text,
          textAlign: 'left',
          textBaseline: 'middle',
          ...fontConfig,
        },
        { class: 'er__entity-label' },
      )
    }

    const fontConfig = getFontConfig(conf, {
      fontSize: attrFontSize,
    })
    let keyCell: TableCell
    if (item.attributeKey) {
      keyCell = TableCell.fromMark(makeLabelTextMark('key', item.attributeKey), 'key')
    }

    const typeCell = TableCell.fromMark(makeLabelTextMark('type', item.attributeType), 'type')
    const nameCell = TableCell.fromMark(makeLabelTextMark('name', item.attributeName), 'name')

    let commentCell: TableCell
    if (item.comment) {
      commentCell = TableCell.fromMark(makeLabelTextMark('name', item.comment), 'comment')
    }

    const row = new TableRow()
    row.addCells([typeCell, nameCell, keyCell, commentCell])

    maxRowContentWidth = Math.max(
      maxRowContentWidth,
      row.map(v => v.mark?.attrs.width || 0).reduce((acc, num) => acc + num, 0),
    )
    const cellUnitHeights = row.map(v => v.mark?.attrs.height || 0)
    cumulativeHeight += Math.max(...cellUnitHeights) + attribPaddingY * 2
    attrNum += 1

    tableBuilder.addRow(row)
  })

  const columnMaxWidths: Record<CellName, number> = {
    key: 0,
    type: 0,
    name: 0,
    comment: 0,
  }

  tableBuilder.rows.forEach(row => {
    row.map(cell => {
      columnMaxWidths[cell.name] = Math.floor(Math.max(columnMaxWidths[cell.name], cell.width))
    })
  })

  const cellOffsets: Record<CellName, number> = {
    key: 0,
    type: 0,
    name: 0,
    comment: 0,
  }
  let cumulativeOffsetX = 0
  Object.keys(cellOffsets)
    .sort((a, b) => CELL_ORDER[a] - CELL_ORDER[b])
    .forEach(k => {
      cellOffsets[k] = cumulativeOffsetX
      if (columnMaxWidths[k]) {
        // cumulativeOffsetX += columnMaxWidths[k] + 2 * attribPaddingX
        cumulativeOffsetX += Math.floor(columnMaxWidths[k] + 2 * attribPaddingX)
      }
    })

  // Calculate the new bounding box of the overall entity, now that attributes have been added
  const bBox = {
    width: Math.ceil(Math.max(conf.minEntityWidth, cumulativeOffsetX, labelBBox.width + attribPaddingX * 2)),
    height:
      attributes.length > 0
        ? cumulativeHeight
        : Math.max(conf.minEntityHeight, labelBBox.height + conf.entityPaddingY * 2),
  }

  if (attributes.length > 0) {
    // Position the entity label near the top of the entity bounding box
    entityText.matrix = mat3.fromTranslation(mat3.create(), [bBox.width / 2, attribPaddingY + labelBBox.height / 2])

    // Add rectangular boxes for the attribute types/names
    let heightOffset = toFixed(labelBBox.height + attribPaddingY * 2) // Start at the bottom of the entity label
    let attribStyle = 'attributeBoxOdd' // We will flip the style on alternate rows to achieve a banded effect

    const attributeFill = conf.attributeFill

    function makeAttribLabelRect(attrs: Partial<Rect['attrs']>) {
      return makeMark('rect', {
        fill: attributeFill,
        stroke: conf.stroke,
        ...attrs,
      })
    }

    const cellOrderKeys = Object.keys(CELL_ORDER)

    tableBuilder.rows.forEach(row => {
      const rowSegs: Text[] = row.map(v => v.mark)

      const rowTextHeight = rowSegs.reduce((out, mark) => Math.max(out, mark.attrs.height), 0)
      const rowHeight = toFixed(rowTextHeight + attribPaddingY * 2)

      // Calculate the alignment y co-ordinate for the text attribute
      const alignY = toFixed(heightOffset + attribPaddingY + rowTextHeight / 2)

      const rowGroup = makeEmptyGroup()
      attributeGroup.children.push(rowGroup)

      let lastColumnRect: Rect
      let rectWidthSum = 0
      cellOrderKeys.forEach(name => {
        if (!columnMaxWidths[name]) return
        const cell = row.getCell(name)
        const offsetX = cellOffsets[name]
        const rect = makeAttribLabelRect({
          x: offsetX,
          y: heightOffset,
          width: columnMaxWidths[name] + attribPaddingX * 2,
          height: rowHeight,
        })
        // console.table({ offsetX, heightOffset, rowHeight, width: rect.attrs.width, alignY })
        rowGroup.children.push(rect)
        rectWidthSum += rect.attrs.width
        lastColumnRect = rect
        if (cell) {
          rowGroup.children.push(cell.mark)
          cell.mark.matrix = mat3.fromTranslation(mat3.create(), [offsetX + attribPaddingX, alignY])
        }
      })

      if (lastColumnRect) {
        // to make sure last rect's right bound reaches entity's right bound
        lastColumnRect.attrs.width += Math.max(0, bBox.width - rectWidthSum)
      }

      const nodeUnitHeights = row.map(v => v?.mark.attrs.height || 0)

      // Increment the height offset to move to the next row
      heightOffset += toFixed(Math.max(...nodeUnitHeights) + attribPaddingY * 2)

      // Flip the attribute style for row banding
      attribStyle = attribStyle == 'attributeBoxOdd' ? 'attributeBoxEven' : 'attributeBoxOdd'
    })
  } else {
    // Ensure the entity box is a decent size without any attributes
    bBox.height = Math.max(conf.minEntityHeight, cumulativeHeight)

    // Position the entity label in the middle of the box
    entityText.matrix = mat3.fromTranslation(mat3.create(), [bBox.width / 2, bBox.height / 2])
  }

  return {
    ...bBox,
    attributeGroup,
  }
}

const drawEntities = function (rootMark: Group, ir: ErDiagramIR, graph: LayoutGraph) {
  const keys = Object.keys(ir.entities)
  const groups: Group[] = []

  keys.forEach(function (id) {
    // Create a group for each entity
    const entity = ir.entities[id]
    const itemId = entity.itemId
    const group = makeMark(
      'group',
      {
        id,
      },
      { children: [], class: 'er__entity', itemId },
    )
    groups.push(group)

    // Label the entity - this is done first so that we can get the bounding box
    // which then determines the size of the rectangle
    const fontConfig = getFontConfig(conf, {
      fontWeight: 'bold',
    })

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...getTextDimensionsInPresicion(id, fontConfig),
        text: id,
        id: itemId,
        textAlign: 'center',
        textBaseline: 'middle',
        fill: conf.textColor,
        ...fontConfig,
      },
      { class: 'er__entity-label' },
    )

    // Draw the rectangle - insert it before the text so that the text is not obscured
    const rectMark = makeMark(
      'rect',
      {
        ...getBaseText(),
        fill: conf.fill,
        stroke: conf.stroke,
        x: 0,
        y: 0,
        radius: conf.borderRadius,
      },
      { class: 'er__entity-box' },
    )
    group.children.push(rectMark, textMark)

    const {
      width: entityWidth,
      height: entityHeight,
      attributeGroup,
    } = drawAttributes(group, textMark, ir.entities[id].attributes)
    safeAssign(rectMark.attrs, {
      width: entityWidth,
      height: entityHeight,
    })

    // Add the entity to the graph
    graph.setNode(id, {
      width: entityWidth,
      height: entityHeight,
      id,
      onLayout(data) {
        const x = Math.floor(data.x)
        const y = Math.floor(data.y)
        const marks = [rectMark, textMark]
        marks.forEach(mark => {
          // center the marks to dest point
          safeAssign(mark.attrs, { x: x - rectMark.attrs.width / 2, y: y - rectMark.attrs.height / 2 })
        })

        if (attributeGroup) {
          positionGroupContents(attributeGroup, {
            x: toFixed(x - entityWidth / 2),
            y: toFixed(y - entityHeight / 2),
            width: data.width,
            height: data.height,
          })
        }
      },
    })

    rootMark.children.push(group)
  })
  return groups
} // drawEntities

const getEdgeName = function (rel: Relationship) {
  return (rel.entityA + rel.roleA + rel.entityB).replace(/\s/g, '')
}

type EdgeData = BaseEdgeData &
  (
    | {
        name: string
        relationship: Relationship
      }
    | {
        isInheritance: true
      }
  ) & {
    onLayout(data: EdgeData): void
  }

/**
 * Add each relationship to the graph
 * @param relationships the relationships to be added
 * @param g the graph
 * @return The array of relationships
 */
const addRelationships = function (relationships: ErDiagramIR['relationships'], g: LayoutGraph) {
  relationships.forEach(function (r) {
    g.setEdge(r.entityA, r.entityB, { name: getEdgeName(r), relationship: r } as EdgeData)
  })
  return relationships
} // addRelationships

let relCnt = 0
/**
 * Draw a relationship using edge information from the graph
 */
const drawRelationshipFromLayout = function (group: Group, rel: Relationship, g: LayoutGraph) {
  relCnt++

  const bounds = makeBounds()

  // Find the edge relating to this relationship
  const edge: EdgeData = g.edge(rel.entityA, rel.entityB)
  if (!('relationship' in edge)) return

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
    },
    { itemId },
  )

  // with dashes if necessary
  if (rel.relSpec.relType === Identification.NON_IDENTIFYING) {
    linePath.attrs.lineDash = [4, 4]
  }
  const endMarkerDirection = calcDirection(restPoints[restPoints.length - 1], restPoints[restPoints.length - 2])
  const endMarker = drawMarkerTo(lastPoint, rel.relSpec.cardA, endMarkerDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-end`,
  })

  const startMarkerDirection = calcDirection(startPoint, secondPoint)
  const startMarker = drawMarkerTo(startPoint, rel.relSpec.cardB, startMarkerDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-start`,
  })
  // Now label the relationship

  // Find the half-way point
  const labelPoint = edge.labelPoint || getPointAt(edge.points, 0.4, true)
  const labelX = labelPoint.x
  const labelY = labelPoint.y

  // Append a text node containing the label
  const labelId = 'rel' + relCnt
  const fontConfig = getFontConfig(conf, {
    fontWeight: 400,
  })

  const labelMark = makeMark(
    'text',
    {
      text: rel.roleA,
      id: labelId,
      textAlign: 'center',
      textBaseline: 'middle',
      x: labelX,
      y: labelY,
      fill: conf.textColor,
      ...fontConfig,
    },
    { itemId, class: 'er__relationship-label' },
  )

  const labelDims = getTextDimensionsInPresicion(rel.roleA, fontConfig)
  labelDims.width += conf.fontSize / 2
  labelDims.height += conf.fontSize / 2
  const labelBg = makeLabelBg(labelDims, { x: labelX, y: labelY }, { id: `#${labelId}`, fill: conf.labelBackground })

  const labelBgBound = calcBound([labelBg])
  tryExpandBounds(bounds, labelBgBound)

  const insertingMarks = [linePath, labelBg, labelMark, startMarker, endMarker].filter(o => !!o)

  group.children.push(...insertingMarks)

  // debug
  // const secondPointMarker = makeCircleWithCoordInPoint(secondPoint)
  // group.children.push(secondPointMarker)
  return { bounds }
}

function drawInheritances(ir: ErDiagramIR, g: LayoutGraph, rootMark: Group) {
  const fontConfig = getFontConfig(conf)
  const inheritanceGroup = makeEmptyGroup()
  rootMark.children.push(inheritanceGroup)

  ir.inheritances.forEach(inh => {
    const LABEL_TEXT = 'ISA'
    const labelDims = getTextDimensionsInPresicion(LABEL_TEXT, fontConfig)

    const labelMark = makeMark(
      'text',
      {
        text: LABEL_TEXT,
        textAlign: 'center',
        textBaseline: 'middle',
        fill: conf.textColor,
        ...fontConfig,
      },
      { class: 'er__relationship-label' },
    )
    inheritanceGroup.children.push(labelMark)

    const labelId = `inherit-${inh.sup}-${inh.sub}`
    const triangleBaseLength = Math.max(labelDims.width, labelDims.height) * 1.8
    const size = {
      width: triangleBaseLength,
      // add extra height, otherwise edge will point through the triangle
      height: Math.ceil(triangleBaseLength * Math.sin(Math.PI / 3)) + 5,
    }

    let inheritNodeCenter: Point

    g.setNode(labelId, {
      ...size,
      onLayout(data) {
        inheritNodeCenter = {
          x: toFixed(data.x),
          y: toFixed(data.y),
        }
      },
    })

    g.setEdge(labelId, inh.sup, {
      isInheritance: true,
      onLayout(edge) {
        const linePath = makeLinePath(edge, conf)
        inheritanceGroup.children.push(linePath)

        const rad = calcDirection(edge.points[0], edge.points[1])
        const { mark: triangle } = makeTriangle(inheritNodeCenter, triangleBaseLength, rad + Math.PI / 2, {
          stroke: conf.edgeColor,
          fill: conf.attributeFill,
          lineJoin: 'round',
        })
        inheritanceGroup.children.unshift(triangle)

        const labelOffseX = (-labelDims.width * Math.cos(rad)) / 4
        const labelOffseY = -labelDims.height * Math.sin(rad)
        safeAssign(labelMark.attrs, {
          x: inheritNodeCenter.x + labelOffseX,
          y: inheritNodeCenter.y + labelOffseY,
        })
      },
    } as EdgeData)

    g.setEdge(inh.sub, labelId, {
      isInheritance: true,
      onLayout(edge) {
        const linePath = makeLinePath(edge, conf)
        inheritanceGroup.children.push(linePath)
      },
    } as EdgeData)
  })
}

function makeLinePath(edge: EdgeData, conf: ErConf) {
  const pathCommands = conf.edgeType === 'curved' ? getPointsCurvePath(edge.points) : getPointsLinearPath(edge.points)
  const linePath = makeMark('path', {
    path: pathCommands,
    stroke: conf.edgeColor,
    lineJoin: 'round',
  })
  return linePath
}

export default erArtist
