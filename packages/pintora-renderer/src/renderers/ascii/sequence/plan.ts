import { SequenceAsciiRenderData, SequenceTextPlan } from './types'

export function widthOf(text: string) {
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
    const boxWidth = current.headerRightCol - current.headerLeftCol
    current.headerLeftCol = current.centerCol - Math.floor(boxWidth / 2)
    current.headerRightCol = current.headerLeftCol + boxWidth
    current.lifelineCol = current.centerCol
  }

  // Pass 1: allocate base rows for each event
  let cursorRow = 0
  const rows: SequenceTextPlan['rows'] = []
  const messages: SequenceTextPlan['messages'] = []
  const notes: SequenceTextPlan['notes'] = []
  const eventIndexToFirstRow = new Map<number, number>()
  const eventIndexToLastRow = new Map<number, number>()

  source.events.forEach(event => {
    eventIndexToFirstRow.set(event.index, cursorRow)
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
    } else if (event.kind === 'note') {
      notes.push({
        anchorActors: event.anchorActorIds,
        lane: event.placement,
        boxCols: [0, Math.max(8, widthOf(event.text) + 4)],
        boxRows: [cursorRow, cursorRow + 2],
      })
      rows.push({ kind: 'note', startRow: cursorRow, endRow: cursorRow + 2 })
      cursorRow += 4
    } else {
      rows.push({ kind: 'divider', startRow: cursorRow, endRow: cursorRow })
      cursorRow += 2
    }
    eventIndexToLastRow.set(event.index, cursorRow - 1)
  })

  // Pass 2: allocate block header rows and section rows
  const blocks: SequenceTextPlan['blocks'] = []
  source.spans.forEach(span => {
    const startFirstRow = eventIndexToFirstRow.get(span.startEventIndex) ?? 0
    const endLastRow = eventIndexToLastRow.get(span.endEventIndex) ?? startFirstRow
    const headerRow = startFirstRow
    const bodyRows: [number, number] = [headerRow, endLastRow]

    // Determine frame columns: span from first actor to last actor
    const frameCols: [number, number] = [
      columns[0]?.headerLeftCol ?? 0,
      columns[columns.length - 1]?.headerRightCol ?? 20,
    ]

    const sections = (span.sections || []).map(section => {
      const sectionRow = eventIndexToFirstRow.get(section.eventIndex) ?? bodyRows[0]
      return {
        label: section.label,
        row: sectionRow,
        eventIndex: section.eventIndex,
      }
    })

    blocks.push({
      kind: span.kind,
      label: span.label,
      startEventIndex: span.startEventIndex,
      endEventIndex: span.endEventIndex,
      headerRow,
      bodyRows,
      frameCols,
      sections,
    })

    rows.push({ kind: 'block-header', startRow: headerRow, endRow: headerRow })
    sections.forEach(section => {
      rows.push({ kind: 'block-section', startRow: section.row, endRow: section.row, eventIndex: section.eventIndex })
    })
  })

  // Pass 3: allocate activation bars
  const activations: SequenceTextPlan['activations'] = []
  source.activations.forEach(activation => {
    const actorColumn = columns.find(column => column.actorId === activation.actorId)
    if (!actorColumn) return
    const leftCol = actorColumn.lifelineCol + 1 + activation.level * 2
    const startRow = eventIndexToFirstRow.get(activation.startEventIndex) ?? 0
    const endRow = eventIndexToLastRow.get(activation.endEventIndex) ?? startRow
    activations.push({
      actorId: activation.actorId,
      startEventIndex: activation.startEventIndex,
      endEventIndex: activation.endEventIndex,
      level: activation.level,
      barCols: [leftCol, leftCol + 1] as [number, number],
      barRows: [startRow, endRow] as [number, number],
    })
  })

  return {
    source,
    columns,
    rows,
    messages,
    notes,
    blocks,
    activations,
  }
}
