import { mat3 } from '@antv/matrix-util'

export type Mark = Rect | Group | Text | Line | Marker | Path

export interface Figure {
  mark: Mark
  width: number
  height: number
}

export interface GraphicsIR extends Figure {}

export interface IMark {
  attrs?: MarkAttrs
  class?: string
  /** for transform */
  matrix?: Matrix | number[]
}

export interface Rect extends IMark {
  type: 'rect'
}

export interface Group extends IMark {
  type: 'group'
  children: Mark[]
}

export interface Text extends IMark {
  type: 'text'
  attrs: MarkAttrs & { text: string }
}

export interface Line extends IMark {
  type: 'line'
  attrs: MarkAttrs & { x1: number; x2: number; y1: number; y2: number }
}

type MarkerSymbol = 'square' | 'circle' | 'diamond' | 'triangle' | 'triangle-down'

export interface Marker extends IMark {
  type: 'marker'
  attrs: MarkAttrs & { symbol: MarkerSymbol }
}

export interface Path extends IMark {
  type: 'path'
  attrs: MarkAttrs & { path: string | (PathCommand[]) }
}

export type MarkType = Mark['type']

export interface MarkTypeMap {
  rect: Rect
  group: Group
  text: Text
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

type ColorType = string | null

export type ElementAttrs = {
  [key: string]: any
}

type BinaryCommandType = 'M' | 'L'

export type PathCommand = [BinaryCommandType, number, number] | ['Z']

/**
 * Common mark attrs, borrowed from @antv/g
 */
export type MarkAttrs = {
  /** x 坐标 */
  x?: number
  /** y 坐标 */
  y?: number
  /** 圆半径 */
  r?: number
  /** 描边颜色 */
  stroke?: ColorType
  /** 描边透明度 */
  strokeOpacity?: number
  /** 填充颜色 */
  fill?: ColorType
  /** 填充透明度 */
  fillOpacity?: number
  /** 整体透明度 */
  opacity?: number
  /** 线宽 */
  lineWidth?: number
  /** 指定如何绘制每一条线段末端 */
  lineCap?: 'butt' | 'round' | 'square'
  /** 用来设置2个长度不为0的相连部分（线段，圆弧，曲线）如何连接在一起的属性（长度为0的变形部分，其指定的末端和控制点在同一位置，会被忽略） */
  lineJoin?: 'bevel' | 'round' | 'miter'
  /**
   * 设置线的虚线样式，可以指定一个数组。一组描述交替绘制线段和间距（坐标空间单位）长度的数字。 如果数组元素的数量是奇数， 数组的元素会被复制并重复。例如， [5, 15, 25] 会变成 [5, 15, 25, 5, 15, 25]。这个属性取决于浏览器是否支持 setLineDash() 函数。
   */
  lineDash?: number[] | null
  /** Path 路径 */
  path?: string | (PathCommand[])
  /** 图形坐标点 */
  points?: object[]
  /** 宽度 */
  width?: number
  /** 高度 */
  height?: number
  /** 阴影模糊效果程度 */
  shadowBlur?: number
  /** 阴影颜色 */
  shadowColor?: ColorType
  /** 阴影 x 方向偏移量 */
  shadowOffsetX?: number
  /** 阴影 y 方向偏移量 */
  shadowOffsetY?: number
  /** 设置文本内容的当前对齐方式 */
  textAlign?: 'start' | 'center' | 'end' | 'left' | 'right'
  /** 设置在绘制文本时使用的当前文本基线 */
  textBaseline?: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'
  /** 字体样式 */
  fontStyle?: 'normal' | 'italic' | 'oblique'
  /** 文本字体大小 */
  fontSize?: number
  /** 文本字体 */
  fontFamily?: string
  /** 文本粗细 */
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number
  /** 字体变体 */
  fontVariant?: 'normal' | 'small-caps' | string
  /** 文本行高 */
  lineHeight?: number
  [key: string]: any
}

// TODO: transform
type Matrix = mat3
