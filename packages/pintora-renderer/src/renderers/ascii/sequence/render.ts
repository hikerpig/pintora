import { buildSequenceTextPlan, messageLabelStartCol, textLinesOf, widthOf } from './plan'
import { canvasToString, fillCols, makeCanvas, put, putText, strokeRect } from './text-canvas'
import { SequenceAsciiRenderData } from './types'

export function renderSequenceAscii(source: SequenceAsciiRenderData) {
  const plan = buildSequenceTextPlan(source)
  const width = plan.viewport.maxCol - plan.viewport.minCol + 1
  const height = plan.viewport.maxRow + 1
  const canvas = makeCanvas(width, height)
  const offsetCol = plan.viewport.renderOffsetCol
  const offsetRow = plan.viewport.renderOffsetRow

  const col = (value: number) => value + offsetCol
  const row = (value: number) => value + offsetRow

  plan.columns.forEach(column => {
    put(canvas, col(column.headerLeftCol), 0, '┌')
    put(canvas, col(column.headerRightCol), 0, '┐')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, col(x), 0, '─')
    put(canvas, col(column.headerLeftCol), 1, '│')
    put(canvas, col(column.headerRightCol), 1, '│')
    put(canvas, col(column.headerLeftCol), 2, '└')
    put(canvas, col(column.headerRightCol), 2, '┘')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, col(x), 2, '─')
    const label = source.actors.find(actor => actor.id === column.actorId)?.label || column.actorId
    putText(canvas, col(column.centerCol - Math.floor(widthOf(label) / 2)), 1, label)
  })

  const lastRow = height - 1
  plan.columns.forEach(column => {
    for (let y = 3; y <= lastRow; y++) {
      put(canvas, col(column.lifelineCol), y, '│')
    }
  })

  plan.activations.forEach(activation => {
    fillCols(
      canvas,
      [col(activation.barCols[0]), col(activation.barCols[1])],
      [row(activation.barRows[0]), row(activation.barRows[1])],
      '|',
    )
  })

  const sortedBlocks = plan.blocks.slice().sort((a, b) => {
    if (a.startEventIndex !== b.startEventIndex) return a.startEventIndex - b.startEventIndex
    return b.endEventIndex - a.endEventIndex
  })
  sortedBlocks.forEach(block => {
    strokeRect(
      canvas,
      [col(block.frameCols[0]), col(block.frameCols[1])],
      [row(block.headerRow), row(block.bodyRows[1])],
    )
  })

  const selfMessageByEventIndex = new Map(plan.selfMessages.map(message => [message.eventIndex, message]))

  plan.messages.forEach(message => {
    const from = plan.columns.find(column => column.actorId === message.fromActorId)!
    const to = plan.columns.find(column => column.actorId === message.toActorId)!

    if (message.isSelf) {
      putText(canvas, col(from.centerCol + 2), row(message.labelRows[0]), message.label)
      const selfMessage = selfMessageByEventIndex.get(message.eventIndex)
      if (!selfMessage) return
      const [leftCol, rightCol] = selfMessage.loopCols
      const [topRow, bottomRow] = selfMessage.loopRows

      for (let x = leftCol + 1; x < rightCol; x++) {
        put(canvas, col(x), row(topRow), '─')
        put(canvas, col(x), row(bottomRow), '─')
      }
      put(canvas, col(rightCol), row(topRow), '┐')
      for (let y = topRow + 1; y < bottomRow; y++) {
        put(canvas, col(rightCol), row(y), '│')
      }
      put(canvas, col(rightCol), row(bottomRow), '┘')
      put(canvas, col(selfMessage.arrowHeadCol), row(selfMessage.arrowHeadRow), '◀')
      return
    }

    const isReverse = to.centerCol < from.centerCol
    const arrowHead = isReverse
      ? message.style === 'open' || message.style === 'open-dashed'
        ? '◁'
        : '◀'
      : message.style === 'open' || message.style === 'open-dashed'
      ? '▷'
      : '▶'
    const leftCol = Math.min(from.centerCol, to.centerCol)
    const rightCol = Math.max(from.centerCol, to.centerCol)
    putText(
      canvas,
      col(messageLabelStartCol(leftCol, rightCol, message.label)),
      row(message.labelRows[0]),
      message.label,
    )
    for (let x = leftCol + 1; x < rightCol; x++)
      put(
        canvas,
        col(x),
        row(message.arrowRow),
        message.style === 'dashed' || message.style === 'open-dashed' ? '╌' : '─',
      )
    put(canvas, col(to.centerCol), row(message.arrowRow), arrowHead)
  })

  sortedBlocks.forEach(block => {
    putText(canvas, col(block.frameCols[0] + 2), row(block.headerRow), `${block.kind} ${block.label}`.trim())
    block.sections.forEach(section => {
      for (let x = block.frameCols[0] + 1; x < block.frameCols[1]; x++) put(canvas, col(x), row(section.row), '╌')
      putText(canvas, col(block.frameCols[0] + 2), row(section.row), section.label)
    })
  })

  plan.dividers.forEach(divider => {
    const strokeRow = row(divider.strokeRow)
    for (let x = divider.ruleCols[0]; x <= divider.ruleCols[1]; x++) {
      if (x >= divider.textExclusionCols[0] && x <= divider.textExclusionCols[1]) continue
      put(canvas, col(x), strokeRow, '─')
    }
    putText(canvas, col(divider.labelCol), strokeRow, divider.text)
  })

  source.events.forEach((event, index) => {
    if (event.kind === 'note') {
      const notePlan = plan.notes.find(n => n.eventIndex === event.index)
      if (!notePlan) return
      const [left, right] = notePlan.boxCols
      const [top, bottom] = notePlan.boxRows

      // Draw box frame
      put(canvas, col(left), row(top), '┌')
      put(canvas, col(right), row(top), '┐')
      put(canvas, col(left), row(bottom), '└')
      put(canvas, col(right), row(bottom), '┘')
      for (let x = left + 1; x < right; x++) {
        put(canvas, col(x), row(top), '─')
        put(canvas, col(x), row(bottom), '─')
      }
      for (let y = top + 1; y < bottom; y++) {
        put(canvas, col(left), row(y), '│')
        put(canvas, col(right), row(y), '│')
      }

      textLinesOf(event.text).forEach((line, lineIndex) => {
        const textStart = left + Math.floor((right - left - widthOf(line)) / 2)
        putText(canvas, col(textStart), row(top + 1 + lineIndex), line)
      })
    }
  })

  return canvasToString(canvas)
}
