import { mat3 } from '@antv/matrix-util'

export type Mark = Group | Rect | Circle | Ellipse | Text | Line | PolyLine | Polygon | Marker | Path | GSymbol

export interface Figure {
  mark: Mark
  width: number
  height: number
}

export interface GraphicsIR extends Figure {
  bgColor?: string
}

export type TransformPolicy = 'stretch' | 'fixed' | 'scale'

export interface IMark {
  attrs?: MarkAttrs
  class?: string
  /** for style cluster */
  cluster?: string
  /** for transform */
  matrix?: Matrix | number[]
  /** come in handy when a symbol needs to be adjusted to fit new position and size */
  transformPolicies?: Partial<{
    h: TransformPolicy
    v: TransformPolicy
    all: TransformPolicy
  }>
  /** node id for style selctor and event */
  itemId?: string
}

export interface Group extends IMark {
  type: 'group'
  children: Mark[]
}

export interface Rect extends IMark {
  type: 'rect'
}

export interface Circle extends IMark {
  type: 'circle'
  attrs: MarkAttrs & {
    x: number
    y: number
    r: number
  }
}

export interface Ellipse extends IMark {
  type: 'ellipse'
  attrs: MarkAttrs & {
    cx: number
    cy: number
    rx: number
    ry: number
  }
}

export interface Text extends IMark {
  type: 'text'
  attrs: MarkAttrs & { text: string }
}

export interface Line extends IMark {
  type: 'line'
  attrs: MarkAttrs & { x1: number; x2: number; y1: number; y2: number }
}

export interface PolyLine extends IMark {
  type: 'polyline'
  attrs: MarkAttrs & { points: PointTuple[] }
}

export interface Polygon extends IMark {
  type: 'polygon'
  attrs: MarkAttrs & { points: PointTuple[] }
}

type MarkerSymbol = 'square' | 'circle' | 'diamond' | 'triangle' | 'triangle-down'

export interface Marker extends IMark {
  type: 'marker'
  attrs: MarkAttrs & { symbol: MarkerSymbol }
}

export interface Path extends IMark {
  type: 'path'
  attrs: MarkAttrs & { path: string | PathCommand[] }
}

export type MarkType = Mark['type']

export interface MarkTypeMap {
  group: Group
  rect: Rect
  circle: Circle
  ellipse: Ellipse
  text: Text
  path: Path
  line: Line
  polyline: PolyLine
  polygon: Polygon
  marker: Marker
  symbol: GSymbol
}

export type BBox = {
  x: number
  y: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export type SimpleBBox = {
  x: number
  y: number
  width: number
  height: number
}

export type Point = {
  x: number
  y: number
}

export type PointTuple = [number, number]

type ColorType = string | null

export type ElementAttrs = {
  [key: string]: any
}

// https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
type BinaryCommandType = 'M' | 'm' | 'L' | 'l'

type SingleCommandType = 'Z' | 'd'

// A rx ry x-axis-rotation large-arc-flag sweep-flag x y
type ArcCommandType = 'A' | 'a'

// C x1 y1, x2 y2, x y
type CurveCommandType = 'C' | 'c'

export type PathCommand =
  | [BinaryCommandType, number, number]
  | [SingleCommandType]
  | [ArcCommandType, ...number[]]
  | [CurveCommandType, number, number, number, number, number, number]

export type Bounds = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export interface GSymbol extends IMark {
  type: 'symbol'
  mark: Group
  symbolBounds: Bounds
  /** usually is the center of the symbol */
  anchorPoint: Point
}

/**
 * Common mark attrs, borrowed from @antv/g
 */
export type MarkAttrs = {
  /** x coord */
  x?: number
  /** y coord */
  y?: number
  /** radius */
  r?: number
  /** stroke color */
  stroke?: ColorType
  /** stroke opacity */
  strokeOpacity?: number
  /** fill color */
  fill?: ColorType
  /** fill opacity */
  fillOpacity?: number
  /** opacity */
  opacity?: number
  /** width of line */
  lineWidth?: number
  /** how the line end is shaped, similar to svg's stroke-linecap */
  lineCap?: 'butt' | 'round' | 'square'
  /** how the line corner is shaped, similar to svg's stroke-linejoin */
  lineJoin?: 'bevel' | 'round' | 'miter'
  /**
   * similar to svg's stroke-dasharray
   */
  lineDash?: number[] | null
  /** path string or commands */
  path?: string | PathCommand[]
  /** points of polyline */
  points?: PointTuple[]
  /** width */
  width?: number
  /** height */
  height?: number
  /** how much the shadow blurs */
  shadowBlur?: number
  shadowColor?: ColorType
  /** shdow offset in x axis */
  shadowOffsetX?: number
  /** shdow offset in y axis */
  shadowOffsetY?: number
  /** similar to svg's text-align */
  textAlign?: 'start' | 'center' | 'end' | 'left' | 'right'
  /** similar to svg's text-baseline */
  textBaseline?: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'
  /** font style */
  fontStyle?: 'normal' | 'italic' | 'oblique'
  /** font size */
  fontSize?: number
  /** font family */
  fontFamily?: string
  /** font weight */
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number
  /** font variant */
  fontVariant?: 'normal' | 'small-caps' | string
  /** line height */
  lineHeight?: number
  [key: string]: any
}

// TODO: transform
type Matrix = mat3
