import { DEFAULT_FONT_FAMILY, calculateTextDimensions, IFont } from '@pintora/core'
import dedent from 'dedent'
import { toFixed } from './number'

export { dedent, DEFAULT_FONT_FAMILY }

export function getTextDimensionsInPresicion(text: string, fontConfig?: IFont, precision = 2) {
  const { width, height } = calculateTextDimensions(text, fontConfig)
  return {
    width: toFixed(width, precision),
    height: toFixed(height, precision),
  }
}
