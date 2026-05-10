import type { ErDiagramIR } from '../db'
import { formatAttribute, widthOf } from './text'
import type { ErAsciiEntityBox } from './types'

export const ENTITY_PADDING_X = 2
export const ENTITY_MIN_WIDTH = 10
export const ENTITY_HEADER_ROWS = 3

export function buildEntityBoxes(ir: ErDiagramIR): ErAsciiEntityBox[] {
  return Object.keys(ir.entities).map((id, order) => {
    const entity = ir.entities[id]
    const attributes = entity.attributes.map(formatAttribute)
    const contentWidth = Math.max(widthOf(id), ...attributes.map(row => widthOf(row.text)), ENTITY_MIN_WIDTH - 2)
    const width = contentWidth + ENTITY_PADDING_X * 2
    const height = attributes.length ? ENTITY_HEADER_ROWS + attributes.length + 1 : 3
    return {
      id,
      entity,
      rank: 0,
      order,
      x: 0,
      y: 0,
      width,
      height,
      centerX: Math.floor(width / 2),
      centerY: Math.floor(height / 2),
      top: 0,
      right: width - 1,
      bottom: height - 1,
      left: 0,
      attributes,
    }
  })
}
