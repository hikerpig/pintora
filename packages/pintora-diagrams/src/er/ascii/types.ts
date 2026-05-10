import type { Cardinality, ErDiagramIR, Identification } from '../db'

export type ErAsciiPoint = { x: number; y: number }

export type ErAsciiAttributeRow = {
  key: string
  type: string
  name: string
  comment: string
  text: string
}

export type ErAsciiEntityBox = {
  id: string
  entity: ErDiagramIR['entities'][string]
  rank: number
  order: number
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
  top: number
  right: number
  bottom: number
  left: number
  attributes: ErAsciiAttributeRow[]
}

export type ErAsciiRelationshipEdge = {
  kind: 'relationship'
  sourceId: string
  targetId: string
  label: string
  cardAtSource: Cardinality
  cardAtTarget: Cardinality
  identification: Identification
  route: ErAsciiPoint[]
  labelPoint: ErAsciiPoint
}

export type ErAsciiInheritanceEdge = {
  kind: 'inheritance'
  superId: string
  subId: string
  route: ErAsciiPoint[]
  labelPoint: ErAsciiPoint
  headPoint: ErAsciiPoint
}

export type ErAsciiLayout = {
  width: number
  height: number
  title?: string
  entities: ErAsciiEntityBox[]
  relationships: ErAsciiRelationshipEdge[]
  inheritances: ErAsciiInheritanceEdge[]
}
