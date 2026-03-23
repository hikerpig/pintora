import { MarkSemantic, SymbolDirection, SymbolFamily, SymbolKind } from '@pintora/core'

export type SymbolDescriptor = {
  family: SymbolFamily
  kind: SymbolKind
  compact?: boolean
  direction?: SymbolDirection
}

export function makeSymbolSemantic(descriptor: SymbolDescriptor): MarkSemantic {
  return {
    role: 'symbol',
    strokePolicy: 'always',
    symbol: {
      family: descriptor.family,
      kind: descriptor.kind,
      compact: descriptor.compact ?? true,
      direction: descriptor.direction,
    },
  }
}
