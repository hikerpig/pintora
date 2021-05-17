import { Mark, MarkAttrs, Rect, Group, Text, Point } from '@pintora/core/lib/type'
import { PALETTE } from './config'

export function getBaseText(): Text['attrs'] {
  return {
    x: 0,
    y: 0,
    text: '',
  }
}

export const getBaseNote = function (): Rect['attrs'] {
  return {
    x: 0,
    y: 0,
    fill: PALETTE.yellow,
    stroke: PALETTE.normalDark,
    width: 50,
    anchor: 'start',
    height: 50,
    rx: 0,
    ry: 0,
  }
}
