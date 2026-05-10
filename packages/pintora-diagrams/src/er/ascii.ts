import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { Cardinality, ErDiagramIR, Identification, Relationship } from './db'

type EntityBoxPlan = {
  id: string
  left: number
  center: number
  width: number
  height: number
}

const ENTITY_GAP = 8
const RELATION_ROW_HEIGHT = 3

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

function textOp(x: number, y: number, text: string, align?: 'left' | 'center' | 'right'): TextDiagramOp {
  return align ? { type: 'text', x, y, text, align } : { type: 'text', x, y, text }
}

function lineOp(
  from: { x: number; y: number },
  to: { x: number; y: number },
  extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
): TextDiagramOp {
  return { type: 'line', from, to, ...extra }
}

function rectOp(x: number, y: number, width: number, height: number): TextDiagramOp {
  return { type: 'rect', x, y, width, height }
}

function formatAttribute(attribute: ErDiagramIR['entities'][string]['attributes'][number]) {
  const parts = [attribute.attributeKey, attribute.attributeType, attribute.attributeName].filter(Boolean)
  if (attribute.comment) parts.push(`"${attribute.comment}"`)
  return parts.join(' ')
}

function cardinalityMarker(cardinality: Cardinality, side: 'left' | 'right') {
  switch (cardinality) {
    case Cardinality.ZERO_OR_ONE:
      return side === 'left' ? '|o' : 'o|'
    case Cardinality.ZERO_OR_MORE:
      return side === 'left' ? '}o' : 'o{'
    case Cardinality.ONE_OR_MORE:
      return side === 'left' ? '}|' : '|{'
    case Cardinality.ONLY_ONE:
      return '||'
    case Cardinality.MORE:
      return side === 'left' ? '}{' : '}{'
  }
}

function relationStroke(relationship: Relationship) {
  return relationship.relSpec.relType === Identification.NON_IDENTIFYING ? 'dashed' : 'solid'
}

function buildEntityBoxOps(ir: ErDiagramIR, top: number) {
  const ops: TextDiagramOp[] = []
  const boxes = new Map<string, EntityBoxPlan>()
  let cursorX = 0
  let maxHeight = 0

  Object.keys(ir.entities).forEach(id => {
    const entity = ir.entities[id]
    const attributeLines = entity.attributes.map(formatAttribute)
    const contentWidth = Math.max(widthOf(id), ...attributeLines.map(widthOf), 4)
    const width = contentWidth + 4
    const height = attributeLines.length ? attributeLines.length + 4 : 3
    const center = cursorX + Math.floor(width / 2)

    ops.push(rectOp(cursorX, top, width, height))
    ops.push(textOp(center, top + 1, id, 'center'))

    if (attributeLines.length) {
      ops.push(lineOp({ x: cursorX + 1, y: top + 2 }, { x: cursorX + width - 2, y: top + 2 }))
      attributeLines.forEach((line, index) => {
        ops.push(textOp(cursorX + 2, top + 3 + index, line))
      })
    }

    boxes.set(id, { id, left: cursorX, center, width, height })
    cursorX += width + ENTITY_GAP
    maxHeight = Math.max(maxHeight, height)
  })

  return {
    ops,
    boxes,
    width: Math.max(0, cursorX - ENTITY_GAP),
    height: maxHeight,
  }
}

function putRelationshipOps(
  ops: TextDiagramOp[],
  relationship: Relationship,
  boxes: Map<string, EntityBoxPlan>,
  y: number,
) {
  const entityA = boxes.get(relationship.entityA)
  const entityB = boxes.get(relationship.entityB)
  if (!entityA || !entityB) return

  if (entityA.center === entityB.center) {
    ops.push(textOp(entityA.left, y, `${relationship.entityA} ${relationship.roleA} ${relationship.entityB}`))
    return
  }

  const aIsLeft = entityA.center < entityB.center
  const left = aIsLeft ? entityA : entityB
  const right = aIsLeft ? entityB : entityA
  const labelCenter = Math.floor((left.center + right.center) / 2)

  if (relationship.roleA) ops.push(textOp(labelCenter, y, relationship.roleA, 'center'))
  ops.push(
    lineOp({ x: entityA.center, y: y + 1 }, { x: entityB.center, y: y + 1 }, { stroke: relationStroke(relationship) }),
  )

  const markerA = cardinalityMarker(relationship.relSpec.cardB, aIsLeft ? 'left' : 'right')
  const markerB = cardinalityMarker(relationship.relSpec.cardA, aIsLeft ? 'right' : 'left')
  ops.push(textOp(aIsLeft ? entityA.center + 1 : entityA.center - widthOf(markerA), y + 1, markerA))
  ops.push(textOp(aIsLeft ? entityB.center - widthOf(markerB) : entityB.center + 1, y + 1, markerB))
}

function putInheritanceOps(ops: TextDiagramOp[], ir: ErDiagramIR, boxes: Map<string, EntityBoxPlan>, startY: number) {
  ir.inheritances.forEach((inheritance, index) => {
    const sup = boxes.get(inheritance.sup)
    const sub = boxes.get(inheritance.sub)
    if (!sup || !sub) return

    const y = startY + index * RELATION_ROW_HEIGHT
    const labelCenter = Math.floor((sup.center + sub.center) / 2)
    ops.push(textOp(labelCenter, y, 'ISA', 'center'))

    if (sup.center === sub.center) {
      ops.push(textOp(sub.left, y + 1, `${inheritance.sub} ISA ${inheritance.sup}`))
      return
    }

    ops.push(lineOp({ x: sub.center, y: y + 1 }, { x: sup.center, y: y + 1 }, { endHead: 'open' }))
  })
}

export function toErTextDiagramPlan(ir: ErDiagramIR): TextDiagramPlan {
  const ops: TextDiagramOp[] = []
  const titleHeight = ir.title ? 2 : 0

  const entityPlan = buildEntityBoxOps(ir, titleHeight)
  ops.push(...entityPlan.ops)

  let width = entityPlan.width
  if (ir.title) {
    width = Math.max(width, widthOf(ir.title) + 2)
    ops.push(textOp(Math.floor(width / 2), 0, ir.title, 'center'))
  }

  const relationStartY = titleHeight + entityPlan.height + 1
  ir.relationships.forEach((relationship, index) => {
    putRelationshipOps(ops, relationship, entityPlan.boxes, relationStartY + index * RELATION_ROW_HEIGHT)
  })

  const inheritanceStartY = relationStartY + ir.relationships.length * RELATION_ROW_HEIGHT
  putInheritanceOps(ops, ir, entityPlan.boxes, inheritanceStartY)

  const relationHeight = (ir.relationships.length + ir.inheritances.length) * RELATION_ROW_HEIGHT
  const height = Math.max(titleHeight + entityPlan.height, relationStartY + relationHeight)

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
    ops,
  }
}
