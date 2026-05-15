import { lineOp, rectOp, textOp, widthOf } from '../../util/text-diagram'
import type { ErAsciiAttributeRow } from './types'
import type { ErDiagramIR } from '../db'

export { lineOp, rectOp, textOp, widthOf }

export function formatAttribute(attribute: ErDiagramIR['entities'][string]['attributes'][number]): ErAsciiAttributeRow {
  const key = attribute.attributeKey || ''
  const type = attribute.attributeType || ''
  const name = attribute.attributeName || ''
  const comment = attribute.comment || ''
  const parts = [key, type, name].filter(Boolean)
  if (comment) parts.push(`"${comment}"`)
  return { key, type, name, comment, text: parts.join(' ') }
}
