import { Mark, MarkType, MarkTypeMap, Bounds, Point } from '@pintora/core'
import { makeBounds } from './mark-positioner'

export type MarkBoundCalculator<K extends MarkType> = (mark: MarkTypeMap[K]) => BoundsWithoutSize

type BoundsWithoutSize = Omit<Bounds, 'width' | 'height'>

// TODO: should consider matrix, if there is rotate
export const MARK_BOUND_CALCULATORS: Partial<{ [K in MarkType]: MarkBoundCalculator<K> }> = {
  rect({ attrs }) {
    return {
      left: attrs.x,
      right: attrs.x + attrs.width,
      top: attrs.y,
      bottom: attrs.y + attrs.height,
    }
  },
  circle({ attrs }) {
    return {
      left: attrs.x - attrs.r,
      right: attrs.x + attrs.r,
      top: attrs.y - attrs.r,
      bottom: attrs.y + attrs.r,
    }
  },
  ellipse({ attrs }) {
    return {
      left: attrs.cx - attrs.rx,
      right: attrs.cx + attrs.rx,
      bottom: attrs.cy - attrs.ry,
      top: attrs.cy + attrs.ry,
    }
  },
  line({ attrs }) {
    return {
      left: Math.min(attrs.x1, attrs.x2),
      right: Math.max(attrs.x1, attrs.x2),
      top: Math.min(attrs.y1, attrs.y2),
      bottom: Math.max(attrs.y1, attrs.y2),
    }
  },
  path() {
    return makeBounds()
    // return calcPathBound(attrs.path as PathCommand[])
  },
}

// // TODO:
// function calcPathBound(commands: PathCommand[]): BoundsWithoutSize {
//   const bounds = makeBounds()
//   commands.forEach(command => {
//   })
//   return {
//     left: -100,
//     right: 100,
//     top: 0,
//     bottom: 100,
//   }
// }

/**
 * Calculate bounds of a list of marks
 */
export function calcBound(marks: Mark[], opts: { recursive?: boolean } = {}): Bounds {
  let left = 0
  let top = 0
  let right = 0
  let bottom = 0
  const allMarks = new Set<Mark>()
  if (opts.recursive) {
    function recursiveAddMark(m: Mark) {
      if (allMarks.has(m)) return
      allMarks.add(m)
      if ('children' in m) {
        m.children.forEach(child => recursiveAddMark(child))
      }
    }
    marks.forEach(child => recursiveAddMark(child))
  } else {
    marks.forEach(child => allMarks.add(child))
  }

  for (const mark of allMarks.values()) {
    const { type } = mark
    const calculator: MarkBoundCalculator<typeof type> = MARK_BOUND_CALCULATORS[type]
    let bound: BoundsWithoutSize = {
      left: null,
      top: null,
      right: null,
      bottom: null,
    }
    if (calculator) {
      bound = calculator(mark)
    } else {
      console.warn('[calcBound] missing calculator', type)
    }
    if (bound.left !== null) left = Math.min(bound.left, left)
    if (bound.top !== null) top = Math.min(bound.top, top)
    if (bound.right !== null) right = Math.max(bound.right, right)
    if (bound.bottom !== null) bottom = Math.max(bound.bottom, bottom)
  }
  const width = right - left
  const height = bottom - top
  return { left, top, right, bottom, width, height }
}

export function updateBoundsByPoints(bounds: Bounds, points: Point[]) {
  points.forEach(p => {
    bounds.left = Math.min(bounds.left, p.x)
    bounds.right = Math.max(bounds.right, p.x)
    bounds.top = Math.min(bounds.top, p.y)
    bounds.bottom = Math.max(bounds.bottom, p.y)
    bounds.width = bounds.right - bounds.left
    bounds.height = bounds.bottom - bounds.top
  })
  return bounds
}

export function floorValues<O>(o: O) {
  for (const k of Object.keys(o)) {
    if (o[k]) o[k] = Math.floor(o[k])
  }
  return o
}
