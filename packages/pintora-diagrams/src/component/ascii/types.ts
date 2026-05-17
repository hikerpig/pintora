import type { LineType } from '../db'

export type ComponentAsciiPoint = { x: number; y: number }

export type ComponentAsciiNodeKind = 'component' | 'interface' | 'group'

export type ComponentAsciiNodeBox = {
  id: string
  kind: ComponentAsciiNodeKind
  label: string
  groupType?: string
  width: number
  height: number
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

export type ComponentAsciiRelationshipEdge = {
  sourceId: string
  targetId: string
  message?: string
  lineType: LineType
  isReversed?: boolean
  route: ComponentAsciiPoint[]
  labelPoint: ComponentAsciiPoint
}

export type ComponentAsciiLayout = {
  title?: string
  width: number
  height: number
  nodes: ComponentAsciiNodeBox[]
  relationships: ComponentAsciiRelationshipEdge[]
}
