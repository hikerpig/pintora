import { GraphicsIR, IDiagramArtist, logger, Group, Text, mat3, safeAssign, createTranslation, Point, calculateTextDimensions } from '@pintora/core'
import { ErDiagramIR, Identification, Entity, Relationship } from './db'
import { ErConf, getConf } from './config'
import { createLayoutGraph, getGraphBounds, LayoutGraph } from '../util/graph'
import { makeMark, getBaseText, calcDirection } from '../util/artist-util'
import dagre from '@pintora/dagre'
import { drawMarkerTo } from './artist-util'

let conf: ErConf

const erArtist: IDiagramArtist<ErDiagramIR, ErConf> = {
  draw(ir, config) {
    conf = getConf()
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
        marginx: 20,
        marginy: 20,
        nodesep: 100,
        edgesep: 100,
        ranksep: 100,
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })

    // Draw the entities (at 0,0), returning the first svg node that got
    // inserted - this represents the insertion point for relationship paths
    const entityMarks = drawEntities(rootMark, ir, g)

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

    const padding = conf.diagramPadding
    rootMark.matrix = createTranslation(padding, padding)

    const gBounds = getGraphBounds(g)
    // console.log('bounds', gBounds)

    const width = gBounds.width
    const height = gBounds.height

    // configureSvgSize(svg, height, width, conf.useMaxWidth)
    // svg.attr('viewBox', `${svgBounds.x - padding} ${svgBounds.y - padding} ${width} ${height}`)
    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
}

/**
 * Draw attributes for an entity
 * @param groupNode the svg group node for the entity
 * @param entityTextNode the svg node for the entity label text
 * @param attributes an array of attributes defined for the entity (each attribute has a type and a name)
 * @return the bounding box of the entity, after attributes have been added
 */
const drawAttributes = (group: Group, entityText: Text, attributes: Entity['attributes']) => {
  const heightPadding = conf.entityPadding / 3 // Padding internal to attribute boxes
  const widthPadding = conf.entityPadding / 3 // Ditto
  const attrFontSize = conf.fontSize * 0.85
  const labelBBox = entityText.attrs
  const attributeNodes: { type: Text; name: Text }[] = [] // Intermediate storage for attribute nodes created so that we can do a second pass
  let maxTypeWidth = 0
  let maxNameWidth = 0
  let cumulativeHeight = labelBBox.height + heightPadding * 2
  let attrNum = 1

  const attributeGroup = makeMark('group', {}, { children: [] })
  group.children.push(attributeGroup)

  attributes.forEach(item => {
    const attrPrefix = `${entityText.attrs.id}-attr-${attrNum}`

    const typeText = makeMark(
      'text',
      {
        ...calculateTextDimensions(item.attributeType),
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
        ...calculateTextDimensions(item.attributeName),
        ...getBaseText(),
        text: item.attributeName,
        id: `${attrPrefix}-name`,
        textAlign: 'left',
        textBaseline: 'middle',
        fontSize: attrFontSize,
      },
      { class: 'er__entity-label' },
    )

    attributeGroup.children.push(typeText, nameText)

    // Keep a reference to the nodes so that we can iterate through them later
    attributeNodes.push({ type: typeText, name: nameText })

    maxTypeWidth = Math.max(maxTypeWidth, typeText.attrs.width)
    maxNameWidth = Math.max(maxNameWidth, nameText.attrs.width)

    cumulativeHeight += Math.max(typeText.attrs.height, nameText.attrs.height) + heightPadding * 2
    attrNum += 1
  })

  // Calculate the new bounding box of the overall entity, now that attributes have been added
  const bBox = {
    width: Math.max(
      conf.minEntityWidth,
      Math.max(labelBBox.width + conf.entityPadding * 2, maxTypeWidth + maxNameWidth + widthPadding * 4),
    ),
    height:
      attributes.length > 0
        ? cumulativeHeight
        : Math.max(conf.minEntityHeight, labelBBox.height + conf.entityPadding * 2),
  }

  // There might be some spare width for padding out attributes if the entity name is very long
  const spareWidth = Math.max(0, bBox.width - (maxTypeWidth + maxNameWidth) - widthPadding * 4)

  if (attributes.length > 0) {
    // Position the entity label near the top of the entity bounding box
    entityText.matrix = mat3.fromTranslation(mat3.create(), [bBox.width / 2, heightPadding + labelBBox.height / 2])

    // Add rectangular boxes for the attribute types/names
    let heightOffset = labelBBox.height + heightPadding * 2 // Start at the bottom of the entity label
    let attribStyle = 'attributeBoxOdd' // We will flip the style on alternate rows to achieve a banded effect

    attributeNodes.forEach(nodePair => {
      // Calculate the alignment y co-ordinate for the type/name of the attribute
      const alignY = heightOffset + heightPadding + Math.max(nodePair.type.attrs.height, nodePair.name.attrs.height) / 2

      // Position the type of the attribute
      nodePair.type.matrix = mat3.fromTranslation(mat3.create(), [widthPadding, alignY])

      const attributeFill = conf.attributeFill

      // Insert a rectangle for the type
      const typeRect = makeMark(
        'rect',
        {
          fill: attributeFill,
          stroke: conf.stroke,
          x: entityText.attrs.x,
          y: heightOffset,
          width: maxTypeWidth + widthPadding * 2 + spareWidth / 2,
          height: nodePair.type.attrs.height + heightPadding * 2,
        },
        { class: attribStyle },
      )

      // Position the name of the attribute
      nodePair.name.matrix = mat3.fromTranslation(mat3.create(), [typeRect.attrs.width + widthPadding, alignY])

      // Insert a rectangle for the name
      const nameRect = makeMark(
        'rect',
        {
          fill: attributeFill,
          stroke: conf.stroke,
          x: typeRect.attrs.x + typeRect.attrs.width,
          y: heightOffset,
          width: maxNameWidth + widthPadding * 2 + spareWidth / 2,
          height: nodePair.name.attrs.height + heightPadding * 2,
        },
        { class: attribStyle },
      )

      // Increment the height offset to move to the next row
      heightOffset += Math.max(nodePair.name.attrs.height, nodePair.name.attrs.height) + heightPadding * 2

      // Flip the attribute style for row banding
      attribStyle = attribStyle == 'attributeBoxOdd' ? 'attributeBoxEven' : 'attributeBoxOdd'

      attributeGroup.children.unshift(typeRect, nameRect)
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

    // const textNode = groupNode
    //   .append('text')
    //   .attr('class', 'er entityLabel')
    //   .attr('id', textId)
    //   .attr('x', 0)
    //   .attr('y', 0)
    //   .attr('dominant-baseline', 'middle')
    //   .attr('text-anchor', 'middle')
    //   // .attr('style', 'font-family: ' + getConfig().fontFamily + '; font-size: ' + conf.fontSize + 'px')
    //   .text(id)

    const textMark = makeMark(
      'text',
      {
        ...getBaseText(),
        ...calculateTextDimensions(id),
        text: id,
        id: textId,
        textAlign: 'center',
        textBaseline: 'middle',
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
      x: 0,
      y: 0,
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
    const nodeData = graph.node(v)
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
      ...restPoints.map((point) => {
        return ['L', point.x, point.y] as any
      })
    ],
    stroke: conf.edgeColor,
  })

  // with dashes if necessary
  if (rel.relSpec.relType === Identification.NON_IDENTIFYING) {
    linePath.attrs.lineDash = [8, 8]
  }

  // TODO: Understand this better
  // let url = ''
  // if (conf.arrowMarkerAbsolute) {
  //   url = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search
  //   url = url.replace(/\(/g, '\\(')
  //   url = url.replace(/\)/g, '\\)')
  // }

  // Decide which start and end markers it needs. It may be possible to be more concise here
  // by reversing a start marker to make an end marker...but this will do for now

  // Note that the 'A' entity's marker is at the end of the relationship and the 'B' entity's marker is at the start
  const endDirection = calcDirection(restPoints[restPoints.length - 1], restPoints[restPoints.length - 2])
  const endMarker = drawMarkerTo(lastPoint, rel.relSpec.cardA, endDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-end`,
  })

  const startDirection = calcDirection(secondPoint, startPoint) + Math.PI // backward
  const startMarker = drawMarkerTo(startPoint, rel.relSpec.cardB, startDirection, {
    stroke: conf.stroke,
    id: `${edge.name}-start`,
  })

  // Now label the relationship

  // // Find the half-way point
  // const len = svgPath.node().getTotalLength()
  // const labelPoint = svgPath.node().getPointAtLength(len * 0.5)

  const labelX = restPoints[0].x
  const labelY = restPoints[0].y

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

  const labelDims = calculateTextDimensions(rel.roleA, { fontSize: conf.fontSize, fontFamily: 'sans-serif', fontWeight: 400 })
  const labelBg = makeMark('rect', {
    id: `#${labelId}`,
    x: labelX - labelDims.width / 2,
    y: labelY - labelDims.height / 2,
    width: labelDims.width,
    height: labelDims.height,
    fill: '#fff',
    opacity: 0.85,
  })

  const insertingMarks = [linePath, labelBg, labelMark, startMarker, endMarker].filter(o => !!o)

  group.children.push(...insertingMarks)
}

export default erArtist
