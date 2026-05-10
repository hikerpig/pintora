import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { Cardinality, ErDiagramIR, Identification, Relationship } from './db'

type EntityBoxPlan = {
  id: string
  left: number
  top: number
  center: number
  width: number
  height: number
}

const ENTITY_GAP = 8
const ENTITY_ROW_GAP = 1
const ENTITY_ROW_MAX_WIDTH = 96
const RELATION_SECTION_GAP = 1
const RELATION_TEXT_INDENT = 2

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

function relationshipConnector(relationship: Relationship) {
  return relationship.relSpec.relType === Identification.NON_IDENTIFYING ? '..' : '--'
}

function formatRelationship(relationship: Relationship) {
  return [
    relationship.entityA,
    `${cardinalityMarker(relationship.relSpec.cardB, 'left')}${relationshipConnector(relationship)}${cardinalityMarker(
      relationship.relSpec.cardA,
      'right',
    )}`,
    relationship.entityB,
    relationship.roleA ? `: ${relationship.roleA}` : '',
  ].join(' ')
}

function formatInheritance(inheritance: ErDiagramIR['inheritances'][number]) {
  return `${inheritance.sub} inherit ${inheritance.sup}`
}

function buildEntityBoxOps(ir: ErDiagramIR, top: number) {
  const ops: TextDiagramOp[] = []
  const boxes = new Map<string, EntityBoxPlan>()
  let cursorX = 0
  let cursorY = top
  let rowHeight = 0
  let maxWidth = 0

  Object.keys(ir.entities).forEach(id => {
    const entity = ir.entities[id]
    const attributeLines = entity.attributes.map(formatAttribute)
    const contentWidth = Math.max(widthOf(id), ...attributeLines.map(widthOf), 4)
    const width = contentWidth + 4
    const height = attributeLines.length ? attributeLines.length + 4 : 3

    if (cursorX > 0 && cursorX + width > ENTITY_ROW_MAX_WIDTH) {
      maxWidth = Math.max(maxWidth, cursorX - ENTITY_GAP)
      cursorX = 0
      cursorY += rowHeight + ENTITY_ROW_GAP
      rowHeight = 0
    }

    const center = cursorX + Math.floor(width / 2)

    ops.push(rectOp(cursorX, cursorY, width, height))
    ops.push(textOp(center, cursorY + 1, id, 'center'))

    if (attributeLines.length) {
      ops.push(lineOp({ x: cursorX + 1, y: cursorY + 2 }, { x: cursorX + width - 2, y: cursorY + 2 }))
      attributeLines.forEach((line, index) => {
        ops.push(textOp(cursorX + 2, cursorY + 3 + index, line))
      })
    }

    boxes.set(id, { id, left: cursorX, top: cursorY, center, width, height })
    cursorX += width + ENTITY_GAP
    rowHeight = Math.max(rowHeight, height)
  })

  maxWidth = Math.max(maxWidth, cursorX > 0 ? cursorX - ENTITY_GAP : 0)

  return {
    ops,
    boxes,
    width: maxWidth,
    height: cursorY + rowHeight - top,
  }
}

function putRelationshipOps(ops: TextDiagramOp[], ir: ErDiagramIR, startY: number) {
  const relationLines = [...ir.inheritances.map(formatInheritance), ...ir.relationships.map(formatRelationship)]
  relationLines.forEach((line, index) => {
    ops.push(textOp(RELATION_TEXT_INDENT, startY + index, line))
  })
  return relationLines
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

  const relationStartY = titleHeight + entityPlan.height + RELATION_SECTION_GAP
  const relationLines = putRelationshipOps(ops, ir, relationStartY)
  width = Math.max(width, ...relationLines.map(line => RELATION_TEXT_INDENT + widthOf(line)))

  const height = Math.max(titleHeight + entityPlan.height, relationStartY + relationLines.length)

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
    ops,
  }
}
