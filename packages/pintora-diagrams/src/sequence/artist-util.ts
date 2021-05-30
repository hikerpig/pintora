import { Mark, MarkAttrs, Rect, MarkTypeMap, Text, Point, Path, PathCommand, createRotateAtPoint, PointTuple } from '@pintora/core'
import { PALETTE } from './config'

export function getBaseText(): Text['attrs'] {
  return {
    x: 0,
    y: 0,
    text: '',
    fill: PALETTE.normalDark,
  }
}

export const getBaseNote = function (): Rect['attrs'] {
  return {
    x: 0,
    y: 0,
    fill: PALETTE.yellow,
    stroke: PALETTE.normalDark,
    width: 50,
    anchor: 'start',
    height: 50,
    rx: 0,
    ry: 0,
  }
}

/**
 * Will point to dest
 */
export function drawArrowTo(dest: Point, baseLength: number, rad: number, attrs?: Partial<MarkAttrs>): Path {
  const { x, y } = dest
  const xOffset = (baseLength / 2) * Math.tan(Math.PI / 3)
  const p: PathCommand[] = [
    ['M', x - xOffset, y - baseLength / 2], // top
    ['L', x - xOffset, y + baseLength / 2], // bottom
    ['L', x, y], // right
    ['Z'],
  ]

  const matrix = createRotateAtPoint(x, y, rad)
  return {
    type: 'path',
    matrix,
    attrs: {
      ...(attrs || {}),
      path: p,
    },
  }
}

/**
 * Will point to dest
 */
export function drawCrossTo(dest: Point, baseLength: number, rad: number, attrs?: Partial<MarkAttrs>): Path {
  const { x, y } = dest
  const offset = baseLength / 2
  const p: PathCommand[] = [
    ['M', x - offset, y - offset],
    ['L', x + offset, y + offset],
    ['M', x + offset, y - offset],
    ['L', x - offset, y + offset],
  ]

  const matrix = createRotateAtPoint(x, y, rad)
  return {
    type: 'path',
    matrix,
    attrs: {
      ...(attrs || {}),
      path: p,
    },
  }
}

export function makeMark<T extends keyof MarkTypeMap, M extends MarkTypeMap[T]>(
  type: T,
  attrs: M['attrs'],
  other?: Partial<M>,
) {
  return {
    type,
    ...(other || {}),
    attrs,
  } as M
}

export function makeLoopLabelBox(position: Point, width: number, height: number, cut: number) {
  const {x, y} = position
  const points: PointTuple[] = [
    [x, y],
    [x + width, y],
    [x + width, y + height - cut],
    [x + width - cut * 1.2, y + height],
    [x, y + height],
  ]
  return makeMark('polygon', {
    points,
  }, { class: 'loop__label-box' })
}
