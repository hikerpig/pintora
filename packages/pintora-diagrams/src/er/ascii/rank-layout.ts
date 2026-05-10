import type { ErDiagramIR } from '../db'
import type { ErAsciiEntityBox, ErAsciiLayout } from './types'

const ENTITY_GAP_X = 6
const ENTITY_GAP_Y = 5
const TITLE_ROWS = 2

export function rankEntities(ir: ErDiagramIR, boxes: ErAsciiEntityBox[]) {
  const byId = new Map(boxes.map(box => [box.id, { ...box }]))
  const rank = new Map(boxes.map(box => [box.id, 0]))

  const relax = (from: string, to: string) => {
    const nextRank = (rank.get(from) || 0) + 1
    if (nextRank > (rank.get(to) || 0)) rank.set(to, nextRank)
  }

  for (let i = 0; i < boxes.length; i++) {
    ir.inheritances.forEach(inh => relax(inh.sup, inh.sub))
    ir.relationships.forEach(rel => relax(rel.entityA, rel.entityB))
  }

  return boxes
    .map(box => ({ ...byId.get(box.id)!, rank: rank.get(box.id) || 0 }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.order - b.order
    })
}

export function placeRankedEntities(
  rankedBoxes: ErAsciiEntityBox[],
  options: { title?: string },
): Pick<ErAsciiLayout, 'width' | 'height' | 'title' | 'entities'> {
  const titleOffset = options.title ? TITLE_ROWS : 0
  const ranks = new Map<number, ErAsciiEntityBox[]>()
  rankedBoxes.forEach(box => {
    const row = ranks.get(box.rank) || []
    row.push(box)
    ranks.set(box.rank, row)
  })

  const rankRows = Array.from(ranks.entries()).sort((a, b) => a[0] - b[0])
  const rowWidths = rankRows.map(
    ([, row]) => row.reduce((sum, box) => sum + box.width, 0) + Math.max(0, row.length - 1) * ENTITY_GAP_X,
  )
  const width = Math.max(1, ...rowWidths, options.title?.length || 0)
  const entities: ErAsciiEntityBox[] = []
  let y = titleOffset

  rankRows.forEach(([, row], index) => {
    const rowWidth = rowWidths[index]
    let x = Math.floor((width - rowWidth) / 2)
    let rowHeight = 0
    row.forEach(box => {
      const placed = {
        ...box,
        x,
        y,
        left: x,
        top: y,
        right: x + box.width - 1,
        bottom: y + box.height - 1,
        centerX: x + Math.floor(box.width / 2),
        centerY: y + Math.floor(box.height / 2),
      }
      entities.push(placed)
      x += box.width + ENTITY_GAP_X
      rowHeight = Math.max(rowHeight, box.height)
    })
    y += rowHeight + ENTITY_GAP_Y
  })

  return {
    title: options.title,
    width,
    height: Math.max(1, y - ENTITY_GAP_Y),
    entities,
  }
}
