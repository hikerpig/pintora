import { SymbolDirection, SymbolKind } from '@pintora/core'

export function getSymbolGlyph(kind: SymbolKind, direction?: SymbolDirection): string | null {
  return getUnicodeSymbolGlyph(kind, direction)
}

function getUnicodeSymbolGlyph(kind: SymbolKind, direction?: SymbolDirection): string | null {
  switch (kind) {
    case 'activity-start':
      return '●'
    case 'activity-end':
      return '◉'
    case 'activity-decision':
      return '◇'
    case 'component-interface':
      return '○'
    case 'er-inheritance-triangle':
      switch (direction) {
        case 'down':
          return '▽'
        case 'left':
          return '◁'
        case 'right':
          return '▷'
        case 'up':
        default:
          return '△'
      }
    default:
      return null
  }
}
