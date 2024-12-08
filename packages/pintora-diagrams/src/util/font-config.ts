import { MarkAttrs } from '@pintora/core'
import { DEFAULT_FONT_FAMILY } from './text'

/**
 * Base font configuration that should be used by all diagrams
 */
export interface BaseFontConfig {
  /** Font family, defaults to DEFAULT_FONT_FAMILY */
  fontFamily: string
  /** Font size in pixels, defaults to 14 */
  fontSize: number
  /** Font weight, defaults to 'normal' */
  fontWeight: MarkAttrs['fontWeight']
  /** Font style (normal, italic), defaults to 'normal' */
  fontStyle: 'normal' | 'italic'
  /** Line height multiplier, defaults to 1.2 */
  lineHeight: number
}

/**
 * Default font configuration that can be extended by diagrams
 */
export const defaultFontConfig: BaseFontConfig = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  lineHeight: 1.2,
}

/**
 * Helper to get font config parameter rules
 */
export function getFontConfigRules() {
  return {
    fontFamily: { valueType: 'string' },
    fontSize: { valueType: 'size' },
    fontWeight: { valueType: 'string' },
    fontStyle: { valueType: 'string' },
    lineHeight: { valueType: 'number' },
  } as const
}
