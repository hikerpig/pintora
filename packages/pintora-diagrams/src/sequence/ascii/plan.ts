import {
  SequenceAsciiRenderData,
  SequenceBaseEventPlan,
  SequenceSpanBlockOccupancyPlan,
  SequenceTextColumn,
  SequenceTextMessagePlan,
  SequenceTextPlan,
  SequenceTextSelfMessagePlan,
  SequenceTextViewport,
} from './types'

export function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function textLinesOf(text: string) {
  return text.split('\n')
}

function textBlockWidth(text: string) {
  return textLinesOf(text).reduce((max, line) => Math.max(max, widthOf(line)), 0)
}

export function messageLabelStartCol(leftCol: number, rightCol: number, label: string) {
  const labelWidth = widthOf(label)
  const spanWidth = rightCol - leftCol
  if (spanWidth <= labelWidth + 2) return leftCol + 1
  return leftCol + Math.floor((spanWidth - labelWidth) / 2)
}

export function buildActorColumns(source: SequenceAsciiRenderData): SequenceTextColumn[] {
  const actorIndexById = new Map(source.actors.map((actor, index) => [actor.id, index]))
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
    const labelGap = source.events.reduce((max, event) => {
      if (event.kind !== 'message' || event.isSelf) return max
      const fromIndex = actorIndexById.get(event.fromActorId)
      const toIndex = actorIndexById.get(event.toActorId)
      if (fromIndex == null || toIndex == null) return max
      const leftIndex = Math.min(fromIndex, toIndex)
      const rightIndex = Math.max(fromIndex, toIndex)
      const crossesBoundary = leftIndex < index && rightIndex >= index
      return crossesBoundary ? Math.max(max, widthOf(event.label) + 4) : max
    }, 0)
    const gap = Math.max(
      8,
      Math.ceil(widthOf(source.actors[index - 1].label) / 2 + widthOf(source.actors[index].label) / 2 + 4),
      labelGap,
    )
    current.centerCol = prev.centerCol + gap
    const boxWidth = current.headerRightCol - current.headerLeftCol
    current.headerLeftCol = current.centerCol - Math.floor(boxWidth / 2)
    current.headerRightCol = current.headerLeftCol + boxWidth
    current.lifelineCol = current.centerCol
  }

  return columns
}

function getMessageFrameCols(
  message: SequenceTextMessagePlan,
  columns: SequenceTextColumn[],
): [number, number] | undefined {
  const from = columns.find(column => column.actorId === message.fromActorId)
  const to = columns.find(column => column.actorId === message.toActorId)
  if (!from || !to) return undefined

  if (message.isSelf) {
    const labelWidth = widthOf(message.label)
    const excursion = Math.max(4, Math.ceil(labelWidth / 2) + 2)
    return [
      Math.min(from.headerLeftCol, from.lifelineCol),
      Math.max(from.headerRightCol, from.lifelineCol + excursion, from.lifelineCol + labelWidth),
    ]
  }

  const left = from.centerCol < to.centerCol ? from : to
  const right = from.centerCol < to.centerCol ? to : from
  const labelStart = messageLabelStartCol(left.centerCol, right.centerCol, message.label)
  const labelEnd = labelStart + widthOf(message.label) - 1
  return [
    Math.min(left.headerLeftCol, left.lifelineCol, labelStart),
    Math.max(right.headerRightCol, right.lifelineCol, labelEnd),
  ]
}

function getSpanFrameCols(
  source: SequenceAsciiRenderData,
  columns: SequenceTextColumn[],
  messages: SequenceTextMessagePlan[],
  notes: SequenceTextPlan['notes'],
  span: SequenceAsciiRenderData['spans'][number],
): [number, number] {
  const contentCols: number[] = []

  messages.forEach(message => {
    if (message.eventIndex < span.startEventIndex || message.eventIndex > span.endEventIndex) return
    const frameCols = getMessageFrameCols(message, columns)
    if (frameCols) contentCols.push(...frameCols)
  })

  notes.forEach(note => {
    if (note.eventIndex < span.startEventIndex || note.eventIndex > span.endEventIndex) return
    contentCols.push(...note.boxCols)
  })

  source.events.forEach(event => {
    if (event.index < span.startEventIndex || event.index > span.endEventIndex) return
    if (event.kind === 'message') {
      const actorIds = [event.fromActorId, event.toActorId]
      actorIds.forEach(actorId => {
        const column = columns.find(item => item.actorId === actorId)
        if (column) contentCols.push(column.headerLeftCol, column.headerRightCol)
      })
    } else if (event.kind === 'note') {
      event.anchorActorIds.forEach(actorId => {
        const column = columns.find(item => item.actorId === actorId)
        if (column) contentCols.push(column.headerLeftCol, column.headerRightCol)
      })
    }
  })

  if (contentCols.length === 0) {
    return [columns[0]?.headerLeftCol || 0, columns[columns.length - 1]?.headerRightCol || 0]
  }

  return [Math.min(...contentCols), Math.max(...contentCols)]
}

export function allocateBaseEventRows(source: SequenceAsciiRenderData): SequenceBaseEventPlan {
  let cursorRow = 0
  const rows: SequenceBaseEventPlan['rows'] = []
  const messages: SequenceBaseEventPlan['messages'] = []
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
      rows.push({
        kind: event.isSelf ? 'self-message' : 'message-label',
        startRow: labelRow,
        endRow: labelRow,
        eventIndex: event.index,
      })
      rows.push({
        kind: event.isSelf ? 'self-message' : 'message-arrow',
        startRow: arrowRow,
        endRow: arrowRow,
        eventIndex: event.index,
      })
      cursorRow += event.isSelf ? 4 : 3
    } else if (event.kind === 'note') {
      const lineCount = textLinesOf(event.text).length
      rows.push({ kind: 'note', startRow: cursorRow, endRow: cursorRow + lineCount + 1, eventIndex: event.index })
      cursorRow += lineCount + 3
    } else {
      rows.push({ kind: 'divider', startRow: cursorRow, endRow: cursorRow, eventIndex: event.index })
      cursorRow += 2
    }

    eventIndexToLastRow.set(event.index, cursorRow - 1)
  })

  return {
    rows,
    messages,
    eventIndexToFirstRow,
    eventIndexToLastRow,
  }
}

export function placeSelfMessageTemplates(
  columns: SequenceTextColumn[],
  messages: SequenceTextMessagePlan[],
): SequenceTextSelfMessagePlan[] {
  return messages.flatMap(message => {
    if (!message.isSelf) return []
    const actorColumn = columns.find(column => column.actorId === message.fromActorId)
    if (!actorColumn) return []

    const labelWidth = widthOf(message.label)
    const excursion = Math.max(4, Math.ceil(labelWidth / 2) + 2)
    const loopRightCol = actorColumn.lifelineCol + excursion
    const loopTopRow = message.arrowRow
    const loopBottomRow = message.arrowRow + 2

    return [
      {
        eventIndex: message.eventIndex,
        actorId: message.fromActorId,
        label: message.label,
        labelRows: message.labelRows,
        loopCols: [actorColumn.lifelineCol, loopRightCol],
        loopRows: [loopTopRow, loopBottomRow],
        arrowHeadCol: actorColumn.lifelineCol,
        arrowHeadRow: loopBottomRow,
      },
    ]
  })
}

export function placeSpanBlockOccupancy(
  source: SequenceAsciiRenderData,
  columns: SequenceTextColumn[],
  baseEvents: SequenceBaseEventPlan,
  baseMessages: SequenceTextPlan['messages'],
  baseNotes: SequenceTextPlan['notes'],
): SequenceSpanBlockOccupancyPlan {
  const rows = baseEvents.rows.map(row => ({ ...row }))
  const messages = baseMessages.map(message => ({
    ...message,
    labelRows: message.labelRows.slice(),
  }))
  const notes = baseNotes.map(note => ({
    ...note,
    anchorActors: note.anchorActors.slice(),
    boxCols: [...note.boxCols] as [number, number],
    boxRows: [...note.boxRows] as [number, number],
  }))
  const eventIndexToFirstRow = new Map(baseEvents.eventIndexToFirstRow)
  const eventIndexToLastRow = new Map(baseEvents.eventIndexToLastRow)
  const blocks: SequenceTextPlan['blocks'] = []
  const rowShifts = new Map<number, number>()

  function getShiftForRow(row: number): number {
    let shift = 0
    const sortedRows = Array.from(rowShifts.keys()).sort((a, b) => a - b)
    for (const shiftRow of sortedRows) {
      if (shiftRow <= row) {
        shift += rowShifts.get(shiftRow) || 0
      } else {
        break
      }
    }
    return shift
  }

  function addShiftAtRow(row: number, amount = 1) {
    const current = rowShifts.get(row) || 0
    rowShifts.set(row, current + amount)
  }

  const sortedSpans = (source.spans || []).slice().sort((a, b) => {
    if (a.startEventIndex !== b.startEventIndex) return a.startEventIndex - b.startEventIndex
    return b.endEventIndex - a.endEventIndex
  })

  sortedSpans.forEach(span => {
    const originalStartRow = eventIndexToFirstRow.get(span.startEventIndex) ?? 0
    const originalEndRow = eventIndexToLastRow.get(span.endEventIndex) ?? originalStartRow
    const shift = getShiftForRow(originalStartRow)
    const headerRow = originalStartRow + shift
    const endRow = originalEndRow + getShiftForRow(originalEndRow)
    const bodyRows: [number, number] = [headerRow, endRow]
    const contentFrameCols = getSpanFrameCols(source, columns, baseMessages, baseNotes, span)
    const headerLabelWidth = widthOf(`${span.kind} ${span.label}`.trim())
    const frameLeftCol = contentFrameCols[0] - 2
    const frameCols: [number, number] = [
      frameLeftCol,
      Math.max(contentFrameCols[1] + 4, frameLeftCol + headerLabelWidth + 3),
    ]

    const sections = (span.sections || []).map(section => {
      const originalSectionRow = eventIndexToFirstRow.get(section.eventIndex) ?? originalStartRow
      const sectionShift = getShiftForRow(originalSectionRow)
      return {
        label: section.label,
        row: originalSectionRow + sectionShift,
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

    addShiftAtRow(originalStartRow, 1)
    sections.forEach(section => {
      addShiftAtRow(eventIndexToFirstRow.get(section.eventIndex) ?? originalStartRow, 1)
    })
    addShiftAtRow(originalEndRow + 1, 1)
  })

  rows.forEach(row => {
    if (row.kind === 'block-header' || row.kind === 'block-section') return
    const shift = getShiftForRow(row.startRow)
    row.startRow += shift
    row.endRow += shift
  })
  messages.forEach(message => {
    const labelShift = getShiftForRow(message.labelRows[0])
    message.labelRows = message.labelRows.map(row => row + labelShift)
    const arrowShift = getShiftForRow(message.arrowRow)
    message.arrowRow += arrowShift
  })
  notes.forEach(note => {
    const shift = getShiftForRow(note.boxRows[0])
    note.boxRows = [note.boxRows[0] + shift, note.boxRows[1] + shift]
  })

  source.events.forEach(event => {
    const originalFirst = eventIndexToFirstRow.get(event.index) ?? 0
    const originalLast = eventIndexToLastRow.get(event.index) ?? originalFirst
    const shift = getShiftForRow(originalFirst)
    eventIndexToFirstRow.set(event.index, originalFirst + shift)
    eventIndexToLastRow.set(event.index, originalLast + shift)
  })

  blocks.forEach(block => {
    const shiftedEndRow = eventIndexToLastRow.get(block.endEventIndex) ?? block.bodyRows[1]
    block.bodyRows = [block.headerRow, Math.max(block.bodyRows[1], shiftedEndRow + 1)]
  })

  return {
    rows,
    messages,
    notes,
    blocks,
    eventIndexToFirstRow,
    eventIndexToLastRow,
  }
}

export function placeActivationOccupancy(
  source: SequenceAsciiRenderData,
  columns: SequenceTextColumn[],
  eventIndexToFirstRow: Map<number, number>,
  eventIndexToLastRow: Map<number, number>,
): SequenceTextPlan['activations'] {
  return (source.activations || []).flatMap(activation => {
    const actorColumn = columns.find(column => column.actorId === activation.actorId)
    if (!actorColumn) return []

    const leftCol = actorColumn.lifelineCol + 1 + activation.level * 2
    const startEventFirstRow = eventIndexToFirstRow.get(activation.startEventIndex) ?? 0
    const endEventLastRow = eventIndexToLastRow.get(activation.endEventIndex) ?? startEventFirstRow
    const startRow = startEventFirstRow + 1
    const endRow = Math.max(startRow, endEventLastRow - 1)

    return [
      {
        actorId: activation.actorId,
        startEventIndex: activation.startEventIndex,
        endEventIndex: activation.endEventIndex,
        level: activation.level,
        barCols: [leftCol, leftCol],
        barRows: [startRow, endRow],
      },
    ]
  })
}

export function placeDividerRows(
  source: SequenceAsciiRenderData,
  columns: SequenceTextColumn[],
  rows: SequenceTextPlan['rows'],
): SequenceTextPlan['dividers'] {
  return source.events.flatMap(event => {
    if (event.kind !== 'divider') return []

    const dividerRow = rows.find(row => row.kind === 'divider' && row.eventIndex === event.index)
    const leftEdge = (columns[0]?.headerLeftCol ?? 0) - 2
    const rightEdge = (columns[columns.length - 1]?.headerRightCol ?? 38) + 2
    const textWidth = widthOf(event.text)
    const gapWidth = textWidth + 4
    const availableWidth = rightEdge - leftEdge + 1
    const gapStart =
      availableWidth >= gapWidth + 4
        ? leftEdge + Math.floor((availableWidth - gapWidth) / 2)
        : leftEdge + Math.max(0, Math.floor((availableWidth - gapWidth) / 2))
    const labelCol = gapStart + 2

    return [
      {
        eventIndex: event.index,
        text: event.text,
        strokeRow: dividerRow?.startRow ?? 0,
        ruleCols: [leftEdge, rightEdge],
        labelCol,
        labelCols: [labelCol, labelCol + textWidth - 1],
        textExclusionCols: [gapStart, gapStart + gapWidth - 1],
      },
    ]
  })
}

export function placeNoteLanes(
  source: SequenceAsciiRenderData,
  columns: SequenceTextColumn[],
  baseEvents: SequenceBaseEventPlan,
): SequenceTextPlan['notes'] {
  return source.events.flatMap(event => {
    if (event.kind !== 'note') return []

    const anchorCols = event.anchorActorIds
      .map(id => columns.find(column => column.actorId === id))
      .filter((column): column is SequenceTextColumn => Boolean(column))

    const row = baseEvents.rows.find(item => item.kind === 'note' && item.eventIndex === event.index)
    const textWidth = Math.max(8, textBlockWidth(event.text) + 4)
    let boxCols: [number, number]

    if (event.placement === 'left' && anchorCols.length > 0) {
      const anchor = anchorCols[0]
      const right = anchor.headerLeftCol - 2
      boxCols = [right - textWidth, right]
    } else if (event.placement === 'right' && anchorCols.length > 0) {
      const anchor = anchorCols[0]
      const left = anchor.headerRightCol + 2
      boxCols = [left, left + textWidth]
    } else if (anchorCols.length > 0) {
      const leftAnchor = anchorCols[0]
      const rightAnchor = anchorCols[anchorCols.length - 1]
      const center = Math.floor((leftAnchor.centerCol + rightAnchor.centerCol) / 2)
      boxCols = [center - Math.floor(textWidth / 2), center + Math.ceil(textWidth / 2)]
    } else {
      boxCols = [0, textWidth]
    }

    return [
      {
        eventIndex: event.index,
        anchorActors: event.anchorActorIds,
        lane: event.placement,
        boxCols,
        boxRows: row ? [row.startRow, row.endRow] : [0, 2],
      },
    ]
  })
}

function buildViewport(
  plan: Pick<SequenceTextPlan, 'columns' | 'rows' | 'notes' | 'selfMessages' | 'dividers' | 'blocks' | 'activations'>,
): SequenceTextViewport {
  const minCol = Math.min(
    0,
    ...plan.columns.map(column => column.headerLeftCol),
    ...plan.notes.map(note => note.boxCols[0]),
    ...plan.selfMessages.map(message => message.loopCols[0]),
    ...plan.dividers.map(divider => divider.ruleCols[0]),
    ...plan.blocks.map(block => block.frameCols[0]),
    ...plan.activations.map(activation => activation.barCols[0]),
  )
  const maxCol = Math.max(
    40,
    ...plan.columns.map(column => column.headerRightCol + 10),
    ...plan.notes.map(note => note.boxCols[1] + 4),
    ...plan.selfMessages.map(message => message.loopCols[1] + 4),
    ...plan.dividers.map(divider => Math.max(divider.ruleCols[1], divider.labelCols[1]) + 4),
    ...plan.blocks.map(block => block.frameCols[1] + 4),
    ...plan.activations.map(activation => activation.barCols[1] + 4),
  )
  const maxRow = Math.max(
    10,
    ...plan.rows.map(row => row.endRow + 6),
    ...plan.notes.map(note => note.boxRows[1] + 6),
    ...plan.selfMessages.map(message => message.loopRows[1] + 6),
    ...plan.blocks.map(block => block.bodyRows[1] + 6),
    ...plan.activations.map(activation => activation.barRows[1] + 6),
  )

  return {
    minCol,
    maxCol,
    minRow: 0,
    maxRow,
    renderOffsetCol: minCol < 0 ? -minCol : 0,
    renderOffsetRow: 4,
  }
}

export function buildSequenceTextPlan(source: SequenceAsciiRenderData): SequenceTextPlan {
  const columns = buildActorColumns(source)
  const baseEvents = allocateBaseEventRows(source)
  const baseMessages = baseEvents.messages.slice()
  const baseNotes = placeNoteLanes(source, columns, baseEvents)

  const spanBlocks = placeSpanBlockOccupancy(source, columns, baseEvents, baseMessages, baseNotes)
  const rows = spanBlocks.rows
  const plannedMessages = spanBlocks.messages
  const plannedNotes = spanBlocks.notes
  const blocks = spanBlocks.blocks
  const eventIndexToFirstRow = spanBlocks.eventIndexToFirstRow
  const eventIndexToLastRow = spanBlocks.eventIndexToLastRow

  const activations = placeActivationOccupancy(source, columns, eventIndexToFirstRow, eventIndexToLastRow)
  const selfMessages = placeSelfMessageTemplates(columns, plannedMessages)
  let dividers: SequenceTextPlan['dividers'] = []
  dividers = placeDividerRows(source, columns, rows)
  const viewport = buildViewport({ columns, rows, notes: plannedNotes, selfMessages, dividers, blocks, activations })

  return {
    source,
    columns,
    rows,
    messages: plannedMessages,
    notes: plannedNotes,
    selfMessages,
    dividers,
    blocks,
    activations,
    viewport,
  }
}
