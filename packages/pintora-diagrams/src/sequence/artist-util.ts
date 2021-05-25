import { Mark, MarkAttrs, Rect, Group, Text, Point, Path, PathCommand, createRotateAtPoint } from '@pintora/core'
import { PALETTE } from './config'

export function getBaseText(): Text['attrs'] {
  return {
    x: 0,
    y: 0,
    text: '',
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
