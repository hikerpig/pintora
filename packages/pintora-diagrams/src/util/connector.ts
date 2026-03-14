import { ConnectorFamily, ConnectorSemantic, ConnectorTerminatorKind, MarkSemantic } from '@pintora/core'

export type ConnectorDescriptor = {
  family: ConnectorFamily
  shaftStyle: ConnectorSemantic['shaftStyle']
  startTerminator: ConnectorTerminatorKind
  endTerminator: ConnectorTerminatorKind
  compact?: boolean
}

export function makeConnectorSemantic(descriptor: ConnectorDescriptor): MarkSemantic {
  return {
    role: 'connector',
    strokePolicy: 'always',
    connector: {
      family: descriptor.family,
      compact: descriptor.compact ?? true,
      shaftStyle: descriptor.shaftStyle,
      startTerminator: { kind: descriptor.startTerminator },
      endTerminator: { kind: descriptor.endTerminator },
    },
  }
}

export function makeAsciiDecorationSemantic(): MarkSemantic {
  return {
    role: 'decoration',
    strokePolicy: 'optional',
  }
}
