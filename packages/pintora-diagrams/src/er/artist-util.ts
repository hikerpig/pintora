import { Point, MarkAttrs, safeAssign, mat3, Mark, Group } from '@pintora/core'
import { makeMark } from '../util/artist-util'
import { Cardinality } from './db'

type MarkerDirection = 'start' | 'end'

type MarkerGenerator = (attrs?: MarkAttrs) => Mark

const MARKER_GENERATORS: Partial<Record<Cardinality, MarkerGenerator>> = {
  [Cardinality.ONLY_ONE]() {
    const mark = makeMark(
      'path',
      {
        path: 'M9,-9 L9,9 M15,-9 L15,9',
      },
      { class: 'er-marker--only-one' },
    )
    return mark
  },
  [Cardinality.ZERO_OR_ONE](attrs) {
    const circle = makeMark('circle', {
      ...attrs,
      fill: '#fff',
      x: 28,
      y: 0,
      r: 6,
    })
    const path = makeMark('path', {
      ...attrs,
      path: 'M14,-9 L14,9',
    })
    const group: Group = {
      type: 'group',
      class: 'er-marker--zero-or-one',
      children: [circle, path],
    }
    return group
  },
  [Cardinality.ONE_OR_MORE]() {
    const mark = makeMark(
      'path',
      {
        path: 'M-18,0 Q 0,18 18,0 Q 0,-18 -18,0 M24,-9 L24,9',
      },
      { class: 'er-marker--one-or-more' },
    )
    return mark
  },
  [Cardinality.ZERO_OR_MORE](attrs) {
    const circle = makeMark('circle', {
      ...attrs,
      fill: '#fff',
      x: 28,
      y: 0,
      r: 6,
    })
    const path = makeMark('path', {
      ...attrs,
      path: 'M-18,0 Q 0,18 18,0 Q 0,-18 -18,0',
    })
    const group: Group = {
      type: 'group',
      class: 'er-marker--zero-or-more',
      children: [circle, path],
    }
    return group
  },
}

export function drawMarkerTo(dest: Point, type: Cardinality, rad: number, attrs?: MarkAttrs) {
  const generator = MARKER_GENERATORS[type]
  if (!generator) return

  const mark = generator(attrs || {})
  safeAssign(mark.attrs, attrs || {})

  const finalMatrix = mat3.create()
  mat3.translate(finalMatrix, mat3.create(), [dest.x, dest.y])
  mat3.rotate(finalMatrix, finalMatrix, rad)
  mark.matrix = finalMatrix
  if (mark.class) mark.class = `er-marker ${mark.class}`
  // console.log('drawMarkerTo', type, rad, finalMatrix, mark)

  return mark
}
