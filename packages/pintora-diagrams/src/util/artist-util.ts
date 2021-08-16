import { MarkAttrs, Rect, Text, Point, Path, PathCommand, createRotateAtPoint, TSize, makeMark } from '@pintora/core'
import { PALETTE } from './theme'

export {
  makeMark,
}

export function getBaseText(): Text['attrs'] {
  return {
    x: 0,
    y: 0,
    text: '',
    fill: PALETTE.normalDark,
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

export function calcDirection(start: Point, end: Point) {
  const ox = end.x - start.x
  const oy = end.y - start.y

  let r = Math.atan(oy / ox)
  if (ox * oy < 0) {
    r = r + Math.PI
  }
  return r
}

export function makeLabelBg(labelDims: TSize, center: Point, attrs: Partial<Rect['attrs']> = {}) {
  const labelBg = makeMark('rect', {
    x: center.x - labelDims.width / 2,
    y: center.y - labelDims.height / 2,
    width: labelDims.width,
    height: labelDims.height,
    fill: '#fff',
    opacity: 0.85,
    ...attrs,
  }, { class: 'label-bg' })
  return labelBg
}
