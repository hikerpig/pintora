import { MarkSemantic, SymbolFamily, SymbolKind } from '@pintora/core'

export type SymbolDescriptor = {
  family: SymbolFamily
  kind: SymbolKind
  compact?: boolean
}

export function makeSymbolSemantic(descriptor: SymbolDescriptor): MarkSemantic {
  return {
    role: 'symbol',
    strokePolicy: 'always',
    symbol: {
      family: descriptor.family,
      kind: descriptor.kind,
      compact: descriptor.compact ?? true,
    },
  }
}
