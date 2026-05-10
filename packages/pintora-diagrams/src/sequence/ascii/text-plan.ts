import type { TextDiagramArrowHead, TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { buildSequenceTextPlan, messageLabelStartCol, textLinesOf, widthOf } from './plan'
import type { SequenceAsciiRenderData, SequenceTextPlan } from './types'

function messageArrowHead(style: SequenceTextPlan['messages'][number]['style']): TextDiagramArrowHead {
  return style === 'open' || style === 'open-dashed' ? 'open' : 'filled'
}

function messageStroke(style: SequenceTextPlan['messages'][number]['style']) {
  return style === 'dashed' || style === 'open-dashed' ? 'dashed' : 'solid'
}

function textOp(x: number, y: number, text: string, align?: 'left' | 'center' | 'right'): TextDiagramOp {
  return align ? { type: 'text', x, y, text, align } : { type: 'text', x, y, text }
}

function lineOp(
  from: { x: number; y: number },
  to: { x: number; y: number },
  extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
): TextDiagramOp {
  return { type: 'line', from, to, ...extra }
}

function rectOp(x: number, y: number, width: number, height: number): TextDiagramOp {
  return { type: 'rect', x, y, width, height }
}

export function sequenceTextPlanToTextDiagramPlan(plan: SequenceTextPlan): TextDiagramPlan {
  const width = plan.viewport.maxCol - plan.viewport.minCol + 1
  const height = plan.viewport.maxRow + 1
  const offsetCol = plan.viewport.renderOffsetCol
  const offsetRow = plan.viewport.renderOffsetRow
  const col = (value: number) => value + offsetCol
  const row = (value: number) => value + offsetRow
  const ops: TextDiagramOp[] = []

  plan.columns.forEach(column => {
    ops.push(rectOp(col(column.headerLeftCol), 0, column.headerRightCol - column.headerLeftCol + 1, 3))
    const label = plan.source.actors.find(actor => actor.id === column.actorId)?.label || column.actorId
    ops.push(textOp(col(column.centerCol), 1, label, 'center'))
  })

  plan.columns.forEach(column => {
    ops.push(lineOp({ x: col(column.lifelineCol), y: 3 }, { x: col(column.lifelineCol), y: height - 1 }))
  })

  plan.activations.forEach(activation => {
    ops.push({
      type: 'fill',
      x: col(activation.barCols[0]),
      y: row(activation.barRows[0]),
      width: activation.barCols[1] - activation.barCols[0] + 1,
      height: activation.barRows[1] - activation.barRows[0] + 1,
      char: '|',
    })
  })

  const sortedBlocks = plan.blocks.slice().sort((a, b) => {
    if (a.startEventIndex !== b.startEventIndex) return a.startEventIndex - b.startEventIndex
    return b.endEventIndex - a.endEventIndex
  })
  sortedBlocks.forEach(block => {
    ops.push(
      rectOp(
        col(block.frameCols[0]),
        row(block.headerRow),
        block.frameCols[1] - block.frameCols[0] + 1,
        block.bodyRows[1] - block.headerRow + 1,
      ),
    )
  })

  const selfMessageByEventIndex = new Map(plan.selfMessages.map(message => [message.eventIndex, message]))
  plan.messages.forEach(message => {
    const from = plan.columns.find(column => column.actorId === message.fromActorId)
    const to = plan.columns.find(column => column.actorId === message.toActorId)
    if (!from || !to) return

    if (message.isSelf) {
      ops.push(textOp(col(from.centerCol + 2), row(message.labelRows[0]), message.label))
      const selfMessage = selfMessageByEventIndex.get(message.eventIndex)
      if (!selfMessage) return
      const [leftCol, rightCol] = selfMessage.loopCols
      const [topRow, bottomRow] = selfMessage.loopRows
      ops.push(lineOp({ x: col(leftCol), y: row(topRow) }, { x: col(rightCol), y: row(topRow) }))
      ops.push(lineOp({ x: col(rightCol), y: row(topRow) }, { x: col(rightCol), y: row(bottomRow) }))
      ops.push(
        lineOp(
          { x: col(rightCol), y: row(bottomRow) },
          { x: col(selfMessage.arrowHeadCol), y: row(selfMessage.arrowHeadRow) },
          { endHead: 'filled' },
        ),
      )
      return
    }

    const leftCol = Math.min(from.centerCol, to.centerCol)
    const rightCol = Math.max(from.centerCol, to.centerCol)
    ops.push(
      textOp(col(messageLabelStartCol(leftCol, rightCol, message.label)), row(message.labelRows[0]), message.label),
    )
    ops.push(
      lineOp(
        { x: col(from.centerCol), y: row(message.arrowRow) },
        { x: col(to.centerCol), y: row(message.arrowRow) },
        { stroke: messageStroke(message.style), endHead: messageArrowHead(message.style) },
      ),
    )
  })

  sortedBlocks.forEach(block => {
    ops.push(textOp(col(block.frameCols[0] + 2), row(block.headerRow), `${block.kind} ${block.label}`.trim()))
    block.sections.forEach(section => {
      ops.push(
        lineOp(
          { x: col(block.frameCols[0] + 1), y: row(section.row) },
          { x: col(block.frameCols[1] - 1), y: row(section.row) },
          { stroke: 'dashed' },
        ),
      )
      ops.push(textOp(col(block.frameCols[0] + 2), row(section.row), section.label))
    })
  })

  plan.dividers.forEach(divider => {
    ops.push(
      lineOp(
        { x: col(divider.ruleCols[0]), y: row(divider.strokeRow) },
        { x: col(divider.textExclusionCols[0] - 1), y: row(divider.strokeRow) },
      ),
    )
    ops.push(
      lineOp(
        { x: col(divider.textExclusionCols[1] + 1), y: row(divider.strokeRow) },
        { x: col(divider.ruleCols[1]), y: row(divider.strokeRow) },
      ),
    )
    ops.push(textOp(col(divider.labelCol), row(divider.strokeRow), divider.text))
  })

  plan.source.events.forEach(event => {
    if (event.kind !== 'note') return
    const notePlan = plan.notes.find(note => note.eventIndex === event.index)
    if (!notePlan) return
    const [left, right] = notePlan.boxCols
    const [top, bottom] = notePlan.boxRows
    ops.push(rectOp(col(left), row(top), right - left + 1, bottom - top + 1))
    textLinesOf(event.text).forEach((line, lineIndex) => {
      ops.push(textOp(col(left + Math.floor((right - left - widthOf(line)) / 2)), row(top + 1 + lineIndex), line))
    })
  })

  return { width, height, ops }
}

export function toSequenceTextDiagramPlan(source: SequenceAsciiRenderData): TextDiagramPlan {
  return sequenceTextPlanToTextDiagramPlan(buildSequenceTextPlan(source))
}
