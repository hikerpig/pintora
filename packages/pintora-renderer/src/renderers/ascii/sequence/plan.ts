import { SequenceAsciiRenderData, SequenceTextPlan } from './types'

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function buildSequenceTextPlan(source: SequenceAsciiRenderData): SequenceTextPlan {
  const columns = source.actors.map((actor, index) => {
    const boxWidth = Math.max(6, widthOf(actor.label) + 4)
    const centerCol = index === 0 ? Math.ceil(boxWidth / 2) : 0
    return {
      actorId: actor.id,
      centerCol,
      headerLeftCol: centerCol - Math.floor(boxWidth / 2),
      headerRightCol: centerCol + Math.ceil(boxWidth / 2),
      lifelineCol: centerCol,
    }
  })

  for (let index = 1; index < columns.length; index++) {
    const prev = columns[index - 1]
    const current = columns[index]
    const gap = Math.max(8, Math.ceil(widthOf(source.actors[index - 1].label) / 2 + widthOf(source.actors[index].label) / 2 + 4))
    current.centerCol = prev.centerCol + gap
    current.headerLeftCol = current.centerCol - Math.floor((current.headerRightCol - current.headerLeftCol) / 2)
    current.headerRightCol = current.headerLeftCol + (current.headerRightCol - current.headerLeftCol)
    current.lifelineCol = current.centerCol
  }

  let cursorRow = 0
  const rows: SequenceTextPlan['rows'] = []
  const messages: SequenceTextPlan['messages'] = []
  const notes: SequenceTextPlan['notes'] = []

  source.events.forEach(event => {
    if (event.kind === 'message') {
      const labelRow = cursorRow
      const arrowRow = cursorRow + 1
      messages.push({
        eventIndex: event.index,
        fromActorId: event.fromActorId,
        toActorId: event.toActorId,
        label: event.label,
        arrowRow,
        labelRows: [labelRow],
        style: event.style,
        isSelf: event.isSelf,
      })
      rows.push({ kind: event.isSelf ? 'self-message' : 'message-label', startRow: labelRow, endRow: labelRow })
      rows.push({ kind: event.isSelf ? 'self-message' : 'message-arrow', startRow: arrowRow, endRow: arrowRow })
      cursorRow += event.isSelf ? 4 : 3
      return
    }
    if (event.kind === 'note') {
      notes.push({
        anchorActors: event.anchorActorIds,
        lane: event.placement,
        boxCols: [0, Math.max(8, widthOf(event.text) + 4)],
        boxRows: [cursorRow, cursorRow + 2],
      })
      rows.push({ kind: 'note', startRow: cursorRow, endRow: cursorRow + 2 })
      cursorRow += 4
      return
    }
    rows.push({ kind: 'divider', startRow: cursorRow, endRow: cursorRow })
    cursorRow += 2
  })

  return {
    source,
    columns,
    rows,
    messages,
    notes,
  }
}
