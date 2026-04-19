import { buildSequenceTextPlan, widthOf } from './plan'
import { canvasToString, makeCanvas, put, putText } from './text-canvas'
import { SequenceAsciiRenderData } from './types'

export function renderSequenceAscii(source: SequenceAsciiRenderData) {
  const plan = buildSequenceTextPlan(source)
  const width = Math.max(40, ...plan.columns.map(column => column.headerRightCol + 10))
  const height = Math.max(10, ...plan.rows.map(row => row.endRow + 6))
  const canvas = makeCanvas(width, height)

  plan.columns.forEach(column => {
    put(canvas, column.headerLeftCol, 0, '┌')
    put(canvas, column.headerRightCol, 0, '┐')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, x, 0, '─')
    put(canvas, column.headerLeftCol, 1, '│')
    put(canvas, column.headerRightCol, 1, '│')
    put(canvas, column.headerLeftCol, 2, '└')
    put(canvas, column.headerRightCol, 2, '┘')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, x, 2, '─')
    const label = source.actors.find(actor => actor.id === column.actorId)?.label || column.actorId
    putText(canvas, column.centerCol - Math.floor(widthOf(label) / 2), 1, label)
  })

  plan.messages.forEach(message => {
    const from = plan.columns.find(column => column.actorId === message.fromActorId)!
    const to = plan.columns.find(column => column.actorId === message.toActorId)!
    putText(canvas, Math.min(from.centerCol, to.centerCol), message.labelRows[0] + 4, message.label)
    if (message.isSelf) {
      put(canvas, from.centerCol + 4, message.arrowRow + 4, '┐')
      put(canvas, from.centerCol + 4, message.arrowRow + 5, '│')
      put(canvas, from.centerCol + 4, message.arrowRow + 6, '┘')
      put(canvas, from.centerCol, message.arrowRow + 6, '◀')
      return
    }
    for (let x = from.centerCol + 1; x < to.centerCol; x++) put(canvas, x, message.arrowRow + 4, message.style === 'dashed' || message.style === 'open-dashed' ? '╌' : '─')
    put(canvas, to.centerCol, message.arrowRow + 4, message.style === 'open' || message.style === 'open-dashed' ? '▷' : '▶')
  })

  source.events.forEach((event, index) => {
    if (event.kind === 'note') {
      const row = plan.rows.filter(row => row.kind === 'note')[0].startRow + 4 + index
      putText(canvas, width - event.text.length - 6, row, `┌ ${event.text} ┐`)
      putText(canvas, width - event.text.length - 6, row + 1, `└${'─'.repeat(event.text.length + 2)}┘`)
    }
    if (event.kind === 'divider') {
      const row = plan.rows.find(row => row.kind === 'divider')!.startRow + 4
      putText(canvas, Math.max(0, Math.floor((width - event.text.length - 4) / 2)), row, `│ ${event.text} │`)
    }
  })

  return canvasToString(canvas)
}
