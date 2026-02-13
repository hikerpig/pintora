import { MarkAttrs } from '@pintora/core'
import { Point } from './types'

export type SegmentOp = {
  kind: 'segment'
  p0: Point
  p1: Point
  layer: 1 | 2
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
  layer: 3
}

export type DrawOp = SegmentOp | TextOp
