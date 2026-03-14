import { SymbolKind } from '@pintora/core'

export function getSymbolGlyph(kind: SymbolKind): string | null {
  return getUnicodeSymbolGlyph(kind)
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
