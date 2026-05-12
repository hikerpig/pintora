import type { SequenceSnapshotBounds } from '../layout-snapshot'

export type SequenceAsciiProjectionOptions = {
  contentBounds: SequenceSnapshotBounds
  minActorGap?: number
}

const DEFAULT_PX_PER_COL = 5
const DEFAULT_PX_PER_ROW = 18

export function makeSequenceAsciiProjection(options: SequenceAsciiProjectionOptions) {
  const minActorGap = options.minActorGap ?? 12
  const startX = options.contentBounds.startX
  const startY = options.contentBounds.startY

  const colForX = (x: number) => Math.max(0, Math.round((x - startX) / DEFAULT_PX_PER_COL))
  const rowForY = (y: number) => Math.max(0, Math.round((y - startY) / DEFAULT_PX_PER_ROW))

  return {
    minActorGap,
    colForX,
    rowForY,
    colsForBounds(bounds: SequenceSnapshotBounds): [number, number] {
      const left = colForX(bounds.startX)
      const right = Math.max(left, colForX(bounds.stopX))
      return [left, right]
    },
    rowsForBounds(bounds: SequenceSnapshotBounds): [number, number] {
      const top = rowForY(bounds.startY)
      const bottom = Math.max(top, rowForY(bounds.stopY))
      return [top, bottom]
    },
  }
}
