import { Rect, Point, PointTuple, symbolRegistry } from '@pintora/core'
import { makeMark, getBaseText, drawArrowTo, drawCrossTo } from '../util/artist-util'
import { ITheme } from '../util/themes/base'

export {
  makeMark,
  getBaseText,
  drawArrowTo,
  drawCrossTo,
}

export const getBaseNote = function (theme: ITheme): Rect['attrs'] {
  return {
    x: 0,
    y: 0,
    fill: theme.noteBackground || theme.groupBackground,
    stroke: theme.primaryBorderColor,
    width: 50,
    anchor: 'start',
    height: 50,
    rx: 0,
    ry: 0,
  }
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
