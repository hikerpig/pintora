import { MarkAttrs } from '@pintora/core'

export type StylableAttrs = {
  backgroundColor: string
  borderColor: string
  fontFamily: MarkAttrs['fontFamily']
  fontStyle: MarkAttrs['fontStyle']
  fontWeight: MarkAttrs['fontWeight']
  opacity: MarkAttrs['opacity']
  textColor: string
}
export type StylableAttrKey = keyof StylableAttrs

export type StyleSelector = {
  type: 'class' | 'id'
  target: string
}

export class StyleRule {
  selector: StyleSelector
  attrs: Partial<StylableAttrs>
}
