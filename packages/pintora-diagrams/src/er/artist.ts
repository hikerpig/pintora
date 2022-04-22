import { GraphicsIR, IDiagramArtist, Group, Text, mat3, safeAssign, getPointAt, Rect, PathCommand } from '@pintora/core'
import { ErDiagramIR, Identification, Entity, Relationship } from './db'
import { ErConf, getConf } from './config'
import {
  BaseEdgeData,
  createLayoutGraph,
  getGraphBounds,
  LayoutGraph,
  LayoutNode,
  getGraphSplinesOption,
} from '../util/graph'
import {
  makeMark,
  getBaseText,
  calcDirection,
  makeLabelBg,
  adjustRootMarkBounds,
  makeEmptyGroup,
} from '../util/artist-util'
import dagre from '@pintora/dagre'
import { drawMarkerTo } from './artist-util'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeBounds, positionGroupContents, tryExpandBounds } from '../util/mark-positioner'
import { calcBound, updateBoundsByPoints } from '../util/bound'
import { getTextDimensionsInPresicion } from '../util/text'
import { toFixed } from '../util/number'

let conf: ErConf

const erArtist: IDiagramArtist<ErDiagramIR, ErConf> = {
  draw(ir, config, opts) {
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

    drawEntities(rootMark, ir, g)

    // Add all the relationships to the graph
    const relationships = addRelationships(ir.relationships, g)

    dagre.layout(g, {})

    // Adjust the positions of the entities so that they adhere to the layout
    adjustEntities(g)

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

    const gBounds = getGraphBounds(g)
    tryExpandBounds(gBounds, relationshipsBounds)

    const pad = conf.diagramPadding

    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds,
      padX: pad,
      padY: pad,
      useMaxWidth: conf.useMaxWidth,
      containerSize: opts?.containerSize,
    })

    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
}

function getFontConfig(conf: ErConf) {
  return {
    fontSize: conf.fontSize,
    fontFamily: conf.fontFamily,
  }
}

type CellName = 'type' | 'name' | 'key' | 'comment'

class TableCell<T = Text> {
  mark: T
  name: CellName
  /** inner width */
  width = 0
  height = 0
  order = 0

  static fromMark(mark: Text, name: CellName, opts: Partial<TableCell> = {}) {
    const cell = new TableCell()
    cell.mark = mark
    cell.name = name
    cell.width = mark.attrs.width
    cell.height = mark.attrs.height

    Object.assign(cell, opts)
    if (!('order' in opts)) {
      if (name in CELL_ORDER) {
        cell.order = CELL_ORDER[name]
      }
    }
    return cell
  }
}

class TableRow {
  cellMap = new Map<string, TableCell>()

  addCells(cells: TableCell[]) {
    const validCells = cells.filter(o => Boolean(o))
    validCells.forEach(cell => {
      this.cellMap.set(cell.name, cell)
    })
  }

  getCell(name: string) {
    return this.cellMap.get(name)
  }

  map<V>(fn: (cell: TableCell) => V) {
    return Array.from(this.cellMap.values()).map(fn)
  }
}

class TableBuilder {
  rows: TableRow[] = []
  addRow(row: TableRow) {
    this.rows.push(row)
  }
}

const CELL_ORDER: Record<CellName, number> = {
  key: 1,
  type: 2,
  name: 3,
  comment: 4,
}

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
          text: text,
          id: `${attrPrefix}-${name}`,
          textAlign: 'left',
          textBaseline: 'middle',
          ...fontConfig,
        },
        { class: 'er__entity-label' },
      )
    }

    const fontConfig = { ...getFontConfig(conf), fontSize: attrFontSize }
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
    let heightOffset = labelBBox.height + attribPaddingY * 2 // Start at the bottom of the entity label
    let attribStyle = 'attributeBoxOdd' // We will flip the style on alternate rows to achieve a banded effect

    const attributeFill = conf.attributeFill

    function makeAttribLabelRect(attrs: Partial<Rect['attrs']>) {
      return makeMark('rect', {
        fill: attributeFill,
        stroke: conf.stroke,
        ...attrs,
      })
    }

    tableBuilder.rows.forEach((row, i) => {
      const rowSegs: Text[] = row.map(v => v.mark)

      const rowTextHeight = rowSegs.reduce((out, mark) => Math.max(out, mark.attrs.height), 0)
      const rowHeight = toFixed(rowTextHeight + attribPaddingY * 2)

      // Calculate the alignment y co-ordinate for the text attribute
      const alignY = toFixed(heightOffset + attribPaddingY + rowTextHeight / 2)

      const rowGroup = makeEmptyGroup()
      attributeGroup.children.push(rowGroup)

      Object.keys(CELL_ORDER).forEach(name => {
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
        if (cell) {
          rowGroup.children.push(cell.mark)
          cell.mark.matrix = mat3.fromTranslation(mat3.create(), [offsetX + attribPaddingX, alignY])
        }
      })

      const nodeUnitHeights = row.map(v => v?.mark.attrs.height || 0)

      // Increment the height offset to move to the next row
      heightOffset += Math.ceil(Math.max(...nodeUnitHeights) + attribPaddingY * 2)

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

/**
 */
const drawEntities = function (rootMark: Group, ir: ErDiagramIR, graph: LayoutGraph) {
  const keys = Object.keys(ir.entities)
  const groups: Group[] = []

  keys.forEach(function (id) {
    // Create a group for each entity
    const group = makeMark(
      'group',
      {
        id,
      },
      { children: [], class: 'er__entity' },
    )
    groups.push(group)

    // Label the entity - this is done first so that we can get the bounding box
    // which then determines the size of the rectangle
    const textId = 'entity-' + id
    const fontConfig = { ...getFontConfig(conf), fontWeight: 'bold' as const }

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...getTextDimensionsInPresicion(id, fontConfig),
        text: id,
        id: textId,
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

const adjustEntities = function (graph: LayoutGraph) {
  graph.nodes().forEach(function (v) {
    const nodeData = graph.node(v) as LayoutNode
    if (nodeData) {
      // console.log('adjustEntities, graph node: ', nodeData)
      if (nodeData.onLayout) {
        nodeData.onLayout(nodeData)
      }
    }
  })
}

const getEdgeName = function (rel: Relationship) {
  return (rel.entityA + rel.roleA + rel.entityB).replace(/\s/g, '')
}

type EdgeData = BaseEdgeData & {
  name: string
  relationship: Relationship
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
 * @param svg the svg node
 * @param rel the relationship to draw in the svg
 * @param g the graph containing the edge information
 */
const drawRelationshipFromLayout = function (group: Group, rel: Relationship, g: LayoutGraph) {
  relCnt++

  const bounds = makeBounds()

  // Find the edge relating to this relationship
  const edge: EdgeData = g.edge(rel.entityA, rel.entityB)

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

  const linePath = makeMark('path', {
    path: pathCommands,
    stroke: conf.edgeColor,
    lineJoin: 'round',
  })

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
  const fontConfig = { ...getFontConfig(conf), fontWeight: 400 }

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
    { class: 'er__relationship-label' },
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

export default erArtist
