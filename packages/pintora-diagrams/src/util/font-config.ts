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
  /** Font style (normal, italic, oblique), defaults to 'normal' */
  fontStyle: any
  // fontStyle: MarkAttrs['fontStyle']
}

/**
 * Default font configuration that can be extended by diagrams
 */
export const defaultFontConfig: BaseFontConfig = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
}

/**
 * Helper to get font config parameter rules
 */
export function getFontConfigRules() {
  return {
    fontFamily: { valueType: 'string' },
    fontSize: { valueType: 'size' },
    fontWeight: { valueType: 'fontWeight' },
    fontStyle: { valueType: 'string' },
  } as const
}

/**
 * Utility function for retrieving font configuration that can be shared between ER and Sequence artists.
 */
export function getFontConfig(conf: Partial<BaseFontConfig>, opts: Partial<BaseFontConfig> = {}): BaseFontConfig {
  return {
    fontFamily: opts.fontFamily || conf.fontFamily,
    fontSize: opts.fontSize || conf.fontSize,
    fontWeight: opts.fontWeight || conf.fontWeight,
    fontStyle: opts.fontStyle || conf.fontStyle,
  }
}
