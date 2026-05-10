import type { TextDiagramOp } from '@pintora/core'
import type { ErAsciiAttributeRow } from './types'
import type { ErDiagramIR } from '../db'

export function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function textOp(x: number, y: number, text: string, align?: 'left' | 'center' | 'right'): TextDiagramOp {
  return align ? { type: 'text', x, y, text, align } : { type: 'text', x, y, text }
}

export function lineOp(
  from: { x: number; y: number },
  to: { x: number; y: number },
  extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
): TextDiagramOp {
  return { type: 'line', from, to, ...extra }
}

export function rectOp(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke?: 'solid' | 'dashed',
): TextDiagramOp {
  return stroke ? { type: 'rect', x, y, width, height, stroke } : { type: 'rect', x, y, width, height }
}

export function formatAttribute(attribute: ErDiagramIR['entities'][string]['attributes'][number]): ErAsciiAttributeRow {
  const key = attribute.attributeKey || ''
  const type = attribute.attributeType || ''
  const name = attribute.attributeName || ''
  const comment = attribute.comment || ''
  const parts = [key, type, name].filter(Boolean)
  if (comment) parts.push(`"${comment}"`)
  return { key, type, name, comment, text: parts.join(' ') }
}
