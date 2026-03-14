import { ConnectorSemantic, MarkAttrs, MarkSemantic, SymbolSemantic } from '@pintora/core'
import { Point } from './types'

/**
 * Rendering layers for ASCII renderer, ordered by priority.
 * Higher layer values are rendered on top of lower ones.
 */
export const enum AsciiLayer {
  /** Background/Fill (layer 1) */
  BACKGROUND = 1,
  /** Borders/Lines (layer 2) */
  LINES = 2,
  /** Arrows/Markers - reserved for future use (layer 3) */
  MARKERS = 3,
  /** Text - highest priority (layer 4) */
  TEXT = 4,
}

/** Layers that can be used for geometric shapes (background, lines, markers) */
export type ShapeLayer = AsciiLayer.BACKGROUND | AsciiLayer.LINES | AsciiLayer.MARKERS

/** Layers that can be used for text rendering */
export type TextLayer = AsciiLayer.TEXT

export type SegmentOp = {
  kind: 'segment'
  p0: Point
  p1: Point
  layer: ShapeLayer
  semantic?: MarkSemantic
}

export type ConnectorOp = {
  kind: 'connector'
  points: Point[]
  layer: ShapeLayer
  semantic: MarkSemantic & { connector: ConnectorSemantic }
}

export type SymbolOp = {
  kind: 'symbol'
  point: Point
  width: number
  height: number
  layer: ShapeLayer
  semantic: MarkSemantic & { symbol: SymbolSemantic }
  fallbackOps: SegmentOp[]
}

export type RectOp = {
  kind: 'rect'
  points: [Point, Point, Point, Point]
  layer: ShapeLayer
  semantic?: MarkSemantic
}

export type TextOp = {
  kind: 'text'
  point: Point
  text: string
  width?: number
  height?: number
  textAlign?: MarkAttrs['textAlign'] | string
  textBaseline?: MarkAttrs['textBaseline'] | string
  lineHeight?: number
  repairs?: Array<{
    kind: 'clear-horizontal-lines'
    row: number
    minCol: number
    maxCol: number
  }>
  layer: TextLayer
}

export type DrawOp = SegmentOp | RectOp | ConnectorOp | SymbolOp | TextOp
