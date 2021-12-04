import { Rect, Point, PointTuple, symbolRegistry } from '@pintora/core'
import { makeMark, getBaseText, drawArrowTo, drawCrossTo, getBaseNote } from '../util/artist-util'

export {
  makeMark,
  getBaseText,
  drawArrowTo,
  drawCrossTo,
  getBaseNote,
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
