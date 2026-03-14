import { SymbolKind } from '@pintora/core'
import { Charset } from './types'

export function getSymbolGlyph(kind: SymbolKind, charset: Charset): string | null {
  const unicode = getUnicodeSymbolGlyph(kind)
  if (charset === 'unicode') return unicode
  return getAsciiSymbolGlyph(kind)
}

function getUnicodeSymbolGlyph(kind: SymbolKind): string | null {
  switch (kind) {
    case 'activity-start':
      return '●'
    case 'activity-end':
      return '◉'
    case 'activity-decision':
      return '◇'
    case 'component-interface':
      return '○'
    default:
      return null
  }
}

function getAsciiSymbolGlyph(kind: SymbolKind): string | null {
  switch (kind) {
    case 'activity-start':
      return '@'
    case 'activity-end':
      return '*'
    case 'activity-decision':
      return '<>'
    case 'component-interface':
      return 'o'
    default:
      return null
  }
}
