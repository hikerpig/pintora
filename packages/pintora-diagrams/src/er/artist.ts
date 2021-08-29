import {
  GraphicsIR,
  IDiagramArtist,
  Group,
  Text,
  mat3,
  safeAssign,
  createTranslation,
  Point,
  calculateTextDimensions,
  getPointAt,
  Rect,
} from '@pintora/core'
import { ErDiagramIR, Identification, Entity, Relationship } from './db'
import { ErConf, getConf } from './config'
import { createLayoutGraph, getGraphBounds, LayoutGraph, LayoutNode } from '../util/graph'
import { makeMark, getBaseText, calcDirection, makeLabelBg } from '../util/artist-util'
import dagre from '@pintora/dagre'
import { drawMarkerTo } from './artist-util'

let conf: ErConf

const erArtist: IDiagramArtist<ErDiagramIR, ErConf> = {
  draw(ir, config) {
    conf = getConf(ir.styleParams)
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
        edgesep: 80,
        ranksep: 100,
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
    // Draw the relationships
    relationships.forEach(function (rel) {
      drawRelationshipFromLayout(relationsGroup, rel, g)
    })
    rootMark.children.unshift(relationsGroup)

    const gBounds = getGraphBounds(g)
    // console.log('bounds', gBounds)

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

type AttributePair = {
  type: Text
  name: Text
  key?: Text
}

/**
 * Draw attributes for an entity
 * @param groupNode the svg group node for the entity
 * @param entityTextNode the svg node for the entity label text
 * @param attributes an array of attributes defined for the entity (each attribute has a type and a name)
 * @return the bounding box of the entity, after attributes have been added
 */
const drawAttributes = (group: Group, entityText: Text, attributes: Entity['attributes']) => {
  const attribPaddingY = conf.entityPaddingY / 2 // Padding internal to attribute boxes
  const attribPaddingX = conf.entityPaddingX / 2 // Ditto
  const attrFontSize = conf.fontSize * 0.85
  const labelBBox = entityText.attrs
  const attributeNodes: AttributePair[] = [] // Intermediate storage for attribute nodes created so that we can do a second pass
  let maxTypeWidth = 0
  let maxNameWidth = 0
  let maxKeyWidth = 0
  let cumulativeHeight = labelBBox.height + attribPaddingY * 2
  let attrNum = 1
  const hasKeyAttribute = attributes.some(item => Boolean(item.attributeKey))

  const attributeGroup = makeMark('group', {}, { children: [] })
  group.children.push(attributeGroup)

  attributes.forEach(item => {
    const attrPrefix = `${entityText.attrs.id}-attr-${attrNum}`

    const fontConfig = { fontSize: conf.fontSize }
    let keyText: Text
    if (item.attributeKey) {
      keyText = makeMark(
        'text',
        {
          ...calculateTextDimensions(item.attributeKey, fontConfig),
          ...getBaseText(),
          text: item.attributeKey,
          id: `${attrPrefix}-key`,
          textAlign: 'left',
          textBaseline: 'middle',
          fontSize: attrFontSize,
        },
        { class: 'er__entity-label' },
      )
    }

    const typeText = makeMark(
      'text',
      {
        ...calculateTextDimensions(item.attributeType, fontConfig),
        ...getBaseText(),
        text: item.attributeType,
        id: `${attrPrefix}-type`,
        textAlign: 'left',
        textBaseline: 'middle',
        fontSize: attrFontSize,
      },
      { class: 'er__entity-label' },
    )
    const nameText = makeMark(
      'text',
      {
        ...calculateTextDimensions(item.attributeName, fontConfig),
        ...getBaseText(),
        text: item.attributeName,
        id: `${attrPrefix}-name`,
        textAlign: 'left',
        textBaseline: 'middle',
        fontSize: attrFontSize,
      },
      { class: 'er__entity-label' },
    )

    if (item.attributeKey) attributeGroup.children.push(keyText)
    attributeGroup.children.push(typeText, nameText)

    // Keep a reference to the nodes so that we can iterate through them later
    attributeNodes.push({ type: typeText, name: nameText, key: keyText })

    if (item.attributeKey) {
      maxKeyWidth = Math.max(maxKeyWidth, keyText.attrs.width)
    }
    maxTypeWidth = Math.max(maxTypeWidth, typeText.attrs.width)
    maxNameWidth = Math.max(maxNameWidth, nameText.attrs.width)

    cumulativeHeight +=
      Math.max(typeText.attrs.height, nameText.attrs.height, keyText?.attrs.height || 0) + attribPaddingY * 2
    attrNum += 1
  })

  const paddingXCount = hasKeyAttribute ? 6: 4
  // Calculate the new bounding box of the overall entity, now that attributes have been added
  const bBox = {
    width: Math.max(
      conf.minEntityWidth,
      Math.max(
        labelBBox.width + conf.entityPaddingX * 2,
        maxTypeWidth + maxNameWidth + maxKeyWidth + attribPaddingX * paddingXCount,
      ),
    ),
    height:
      attributes.length > 0
        ? cumulativeHeight
        : Math.max(conf.minEntityHeight, labelBBox.height + conf.entityPaddingY * 2),
  }

  if (attributes.length > 0) {
    const nodeXOffsets: Record<keyof AttributePair, number> = {
      key: 0,
      type: maxKeyWidth,
      name: maxKeyWidth + maxTypeWidth + 2 * attribPaddingX,
    }
    if (hasKeyAttribute) {
      nodeXOffsets.type += 2 * attribPaddingX
      nodeXOffsets.name += 2 * attribPaddingX
    }

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

    attributeNodes.forEach(nodePair => {
      const rowSegs: Text[] = []
      if (nodePair.key) {
        rowSegs.push(nodePair.key)
      }
      rowSegs.push(nodePair.type)
      rowSegs.push(nodePair.name)

      const rowTextHeight = rowSegs.reduce((out, mark) => Math.max(out, mark.attrs.height), 0)
      const rowHeight = rowTextHeight + attribPaddingY * 2
      // Calculate the alignment y co-ordinate for the type/name of the attribute
      const alignY = heightOffset + attribPaddingY + rowTextHeight / 2

      if (nodePair.key) {
        const keyRect = makeAttribLabelRect({
          x: entityText.attrs.x,
          y: heightOffset,
          width: maxKeyWidth + attribPaddingX * 2,
          height: rowHeight,
        })
        attributeGroup.children.unshift(keyRect)
        nodePair.key.matrix = mat3.fromTranslation(mat3.create(), [nodeXOffsets.key + attribPaddingX, alignY])
      }

      // Position the type of the attribute
      nodePair.type.matrix = mat3.fromTranslation(mat3.create(), [nodeXOffsets.type + attribPaddingX, alignY])

      // Insert a rectangle for the type
      const typeRect = makeAttribLabelRect({
        x: entityText.attrs.x + nodeXOffsets.type,
        y: heightOffset,
        width: maxTypeWidth + attribPaddingX * 2,
        height: rowHeight,
      })

      // Position the name of the attribute
      nodePair.name.matrix = mat3.fromTranslation(mat3.create(), [nodeXOffsets.name + attribPaddingX, alignY])

      // Insert a rectangle for the name
      const nameRect = makeAttribLabelRect({
        x: entityText.attrs.x + nodeXOffsets.name,
        y: heightOffset,
        width: maxNameWidth + attribPaddingX * 2,
        height: rowHeight,
      })

      // Increment the height offset to move to the next row
      heightOffset += Math.max(nodePair.name.attrs.height, nodePair.name.attrs.height) + attribPaddingY * 2

      // Flip the attribute style for row banding
      attribStyle = attribStyle == 'attributeBoxOdd' ? 'attributeBoxEven' : 'attributeBoxOdd'

      attributeGroup.children.unshift(typeRect, nameRect)
    })

    if (hasKeyAttribute) {
      // a background rect for key column
      const entityLabelOuterHeight = labelBBox.height + attribPaddingY * 2
      const keyColBgRect = makeAttribLabelRect({
        x: entityText.attrs.x,
        y: entityText.attrs.y + entityLabelOuterHeight,
        width: maxKeyWidth + attribPaddingX * 2,
        height: cumulativeHeight - entityLabelOuterHeight,
      })
      attributeGroup.children.unshift(keyColBgRect)
    }
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
    const fontConfig = { fontSize: conf.fontSize, fontWeight: 'bold' as const }

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...calculateTextDimensions(id, fontConfig),
        text: id,
        id: textId,
        textAlign: 'center',
        textBaseline: 'middle',
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
        // console.log('on layout', x, y)
        const marks = [rectMark, textMark]
        marks.forEach(mark => {
          // center the marks to dest point
          safeAssign(mark.attrs, { x: x - rectMark.attrs.width / 2, y: y - rectMark.attrs.height / 2 })
        })

        if (attributeGroup) {
          attributeGroup.children.forEach(child => {
            safeAssign(child.attrs, {
              x: x + child.attrs.x - entityWidth / 2,
              y: y + child.attrs.y - entityHeight / 2,
            })
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
    const nodeData: LayoutNode = graph.node(v) as any
    if (nodeData) {
      // console.log('adjustEntities, graph node: ', nodeData)
      if (nodeData.onLayout) {
        nodeData.onLayout(nodeData)
      }
    }
  })
}

const getEdgeName = function (rel) {
  return (rel.entityA + rel.roleA + rel.entityB).replace(/\s/g, '')
}

type EdgeData = {
  name: string
  relationship: Relationship
  points: Point[]
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
 * @param insert the insertion point in the svg DOM (because relationships have markers that need to sit 'behind' opaque entity boxes)
 */
const drawRelationshipFromLayout = function (group: Group, rel: Relationship, g: LayoutGraph) {
  relCnt++

  // Find the edge relating to this relationship
  const edge: EdgeData = g.edge(rel.entityA, rel.entityB)

  // Get a function that will generate the line path
  // const lineFunction = line()
  //   .x(function (d) {
  //     return d.x
  //   })
  //   .y(function (d) {
  //     return d.y
  //   })
  //   .curve(curveBasis)

  // Insert the line at the right place
  // const svgPath = svg
  //   .insert('path', '#' + insert)
  //   .attr('class', 'er relationshipLine')
  //   // .attr('d', lineFunction(edge.points))
  //   .attr('stroke', conf.stroke)
  //   .attr('fill', 'none')

  const [startPoint, ...restPoints] = edge.points
  const secondPoint = restPoints[0]
  const lastPoint = restPoints[restPoints.length - 1]

  const linePath = makeMark('path', {
    path: [
      ['M', startPoint.x, startPoint.y],
      ...restPoints.map(point => {
        return ['L', point.x, point.y] as any
      }),
    ],
    stroke: conf.edgeColor,
    lineJoin: 'round',
  })

  // with dashes if necessary
  if (rel.relSpec.relType === Identification.NON_IDENTIFYING) {
    linePath.attrs.lineDash = [4, 4]
  }

  // Decide which start and end markers it needs. It may be possible to be more concise here
  // by reversing a start marker to make an end marker...but this will do for now

  // Note that the 'A' entity's marker is at the end of the relationship and the 'B' entity's marker is at the start
  const endDirection = calcDirection(restPoints[restPoints.length - 1], restPoints[restPoints.length - 2])
  const endMarker = drawMarkerTo(lastPoint, rel.relSpec.cardA, endDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-end`,
  })

  const startDirection = calcDirection(secondPoint, startPoint) // backward
  const startMarker = drawMarkerTo(startPoint, rel.relSpec.cardB, startDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-start`,
  })

  // Now label the relationship

  // Find the half-way point
  const labelPoint = getPointAt(edge.points, 0.4, true)
  const labelX = labelPoint.x
  const labelY = labelPoint.y

  // Append a text node containing the label
  const labelId = 'rel' + relCnt

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
      fontSize: conf.fontSize,
    },
    { class: 'er__relationship-label' },
  )

  const labelDims = calculateTextDimensions(rel.roleA, {
    fontSize: conf.fontSize,
    fontFamily: 'sans-serif',
    fontWeight: 400,
  })
  labelDims.width += conf.fontSize / 2
  labelDims.height += conf.fontSize / 2
  const labelBg = makeLabelBg(labelDims, { x: labelX, y: labelY }, { id: `#${labelId}`, fill: conf.labelBackground })

  const insertingMarks = [linePath, labelBg, labelMark, startMarker, endMarker].filter(o => !!o)

  group.children.push(...insertingMarks)
}

export default erArtist
