import type { TextDiagramArrowHead, TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import type { SequenceLayoutSnapshot } from '../layout-snapshot'
import { makeSequenceAsciiProjection } from './metrics'
import { messageLabelStartCol, textLinesOf, widthOf } from './plan'

type SequenceMessageEvent = Extract<SequenceLayoutSnapshot['events'][number], { kind: 'message' }>
type SequenceEvent = SequenceLayoutSnapshot['events'][number]

const MIN_ACTOR_WIDTH = 10
const ACTOR_LABEL_PAD = 4
const HEADER_HEIGHT = 3
const FIRST_EVENT_ROW = 5
const MIN_EVENT_ROW_OFFSET = 4
const EVENT_ROW_START = 3
const SELF_LOOP_WIDTH = 8
const MIN_SPAN_WIDTH = 8
const SECTION_PAD = 2
const ACTIVATION_CHAR = '|'

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

function messageArrowHead(style: SequenceMessageEvent['style']): TextDiagramArrowHead {
  return style === 'open' || style === 'open-dashed' ? 'open' : 'filled'
}

function messageStroke(style: SequenceMessageEvent['style']) {
  return style === 'dashed' || style === 'open-dashed' ? 'dashed' : 'solid'
}

function planWidth(ops: TextDiagramOp[]) {
  let max = 1
  for (const op of ops) {
    let v = 0
    if (op.type === 'text') v = op.x + widthOf(op.text) + 1
    else if (op.type === 'rect') v = op.x + op.width + 1
    else if (op.type === 'fill') v = op.x + op.width + 1
    else if (op.type === 'line') v = Math.max(op.from.x, op.to.x) + 1
    if (v > max) max = v
  }
  return max
}

function eventRowSpan(event: SequenceEvent) {
  if (event.kind === 'message') return event.isSelf ? 4 : 2
  if (event.kind === 'note') return Math.max(3, textLinesOf(event.text).length + 2)
  return 1
}

function previousFreeRow(row: number, min: number) {
  return Math.max(min, row - SECTION_PAD)
}

function actorHeaderColsRange(actorHeaderCols: Array<[number, number]>): [min: number, max: number] {
  let min = Infinity
  let max = -Infinity
  for (const [left, right] of actorHeaderCols) {
    if (left < min) min = left
    if (right > max) max = right
  }
  return [min, max]
}

export function buildSequenceTextPlanFromSnapshot(snapshot: SequenceLayoutSnapshot): TextDiagramPlan {
  const projection = makeSequenceAsciiProjection({
    contentBounds: snapshot.contentBounds,
    minActorGap: 12,
  })
  const ops: TextDiagramOp[] = []
  const overlayOps: TextDiagramOp[] = []
  const actorCols = new Map<string, number>()
  const actorHeaderCols: Array<[number, number]> = []
  const eventRows = new Map<number, number>()
  const eventBottomRows = new Map<number, number>()

  snapshot.actors
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(actor => {
      const centerCol = projection.colForX(actor.centerX)
      const width = Math.max(MIN_ACTOR_WIDTH, widthOf(actor.label) + ACTOR_LABEL_PAD)
      const leftCol = Math.max(0, centerCol - Math.floor(width / 2))
      const rightCol = leftCol + width - 1
      actorCols.set(actor.id, centerCol)
      actorHeaderCols.push([leftCol, rightCol])
      ops.push(rectOp(leftCol, 0, width, HEADER_HEIGHT))
      ops.push(textOp(centerCol, 1, actor.label, 'center'))
    })

  let nextEventRow = FIRST_EVENT_ROW
  snapshot.events.forEach(event => {
    const projectedRow = Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(event.bounds.startY) + EVENT_ROW_START)
    const row = Math.max(nextEventRow, projectedRow)
    const bottomRow = row + eventRowSpan(event) - 1
    eventRows.set(event.index, row)
    eventBottomRows.set(event.index, bottomRow)
    nextEventRow = bottomRow + SECTION_PAD
  })

  const maxEventRow = Math.max(MIN_EVENT_ROW_OFFSET, ...Array.from(eventBottomRows.values()), nextEventRow - 1)
  actorCols.forEach(centerCol => {
    ops.push(lineOp({ x: centerCol, y: HEADER_HEIGHT }, { x: centerCol, y: maxEventRow }))
  })

  snapshot.activations.forEach(activation => {
    const [left, right] = projection.colsForBounds(activation.bounds)
    const startRow =
      eventRows.get(activation.startEventIndex) ??
      Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(activation.bounds.startY) + EVENT_ROW_START)
    const endRow =
      eventBottomRows.get(activation.endEventIndex) ??
      Math.max(startRow, projection.rowForY(activation.bounds.stopY) + EVENT_ROW_START)
    const actorCol = actorCols.get(activation.actorId)
    ops.push({
      type: 'fill',
      x:
        actorCol ??
        Math.max(left, Math.min(right, projection.colForX((activation.bounds.startX + activation.bounds.stopX) / 2))),
      y: startRow,
      width: 1,
      height: Math.max(1, endRow - startRow + 1),
      char: ACTIVATION_CHAR,
    })
  })

  const occupiedSpanLabelRows = new Set<number>()
  snapshot.spans.forEach(span => {
    const [left, right] = projection.colsForBounds(span.bounds)
    const startRow =
      eventRows.get(span.startEventIndex) ??
      Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(span.bounds.startY) + EVENT_ROW_START)
    const endRow =
      eventBottomRows.get(span.endEventIndex) ??
      Math.max(startRow, projection.rowForY(span.bounds.stopY) + EVENT_ROW_START)
    const frameTop = Math.max(HEADER_HEIGHT, startRow - EVENT_ROW_START)
    const frameBottom = Math.max(frameTop + SECTION_PAD, endRow + 1)
    let labelRow = frameTop
    while (occupiedSpanLabelRows.has(labelRow) || labelRow === startRow - 1) {
      labelRow++
    }
    occupiedSpanLabelRows.add(labelRow)
    ops.push(rectOp(left, frameTop, Math.max(MIN_SPAN_WIDTH, right - left + 1), frameBottom - frameTop + 1))
    overlayOps.push(textOp(left + SECTION_PAD, labelRow, `${span.kind} ${span.label}`.trim()))
    span.sections?.forEach(section => {
      const row = previousFreeRow(
        eventRows.get(section.eventIndex) ?? projection.rowForY(section.y) + EVENT_ROW_START,
        frameTop + 1,
      )
      ops.push(lineOp({ x: left + 1, y: row }, { x: right - 1, y: row }, { stroke: 'dashed' }))
      overlayOps.push(textOp(left + SECTION_PAD, row, section.label))
    })
  })

  snapshot.events.forEach(event => {
    if (event.kind === 'note') {
      const [left, right] = projection.colsForBounds(event.bounds)
      const noteTop =
        eventRows.get(event.index) ??
        Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(event.bounds.startY) + EVENT_ROW_START)
      const lines = textLinesOf(event.text)
      const noteBottom = Math.max(noteTop + SECTION_PAD, noteTop + lines.length + 1)
      ops.push(rectOp(left, noteTop, Math.max(MIN_SPAN_WIDTH, right - left + 1), noteBottom - noteTop + 1))
      lines.forEach((line, index) => {
        ops.push(textOp(left + SECTION_PAD, noteTop + 1 + index, line))
      })
      return
    }

    if (event.kind === 'divider') {
      const [projectedLeft, projectedRight] = projection.colsForBounds(event.bounds)
      const [actorLeft, actorRight] = actorHeaderCols.length
        ? actorHeaderColsRange(actorHeaderCols)
        : [projectedLeft, projectedRight]
      const left = Math.min(projectedLeft, actorLeft - SECTION_PAD)
      let right = Math.max(projectedRight, actorRight + SECTION_PAD)
      const row =
        eventRows.get(event.index) ??
        Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(event.bounds.startY) + EVENT_ROW_START)
      let labelStart = left + Math.max(1, Math.floor((right - left - widthOf(event.text)) / 2))
      actorCols.forEach(actorCol => {
        if (actorCol >= labelStart - SECTION_PAD && actorCol < labelStart) {
          labelStart = actorCol + EVENT_ROW_START
        }
      })
      right = Math.max(right, labelStart + widthOf(event.text) + EVENT_ROW_START)
      ops.push(lineOp({ x: left, y: row }, { x: Math.max(left, labelStart - SECTION_PAD), y: row }))
      ops.push(textOp(labelStart, row, event.text))
      ops.push(lineOp({ x: labelStart + widthOf(event.text) + 1, y: row }, { x: right, y: row }))
      return
    }

    if (event.kind !== 'message') return

    if (event.isSelf) {
      const actorCol = actorCols.get(event.fromActorId)
      if (actorCol == null) return
      const row =
        eventRows.get(event.index) ??
        Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(event.bounds.startY) + EVENT_ROW_START)
      const loopRight = actorCol + SELF_LOOP_WIDTH
      ops.push(textOp(actorCol + SECTION_PAD, row - 1, event.label))
      ops.push(lineOp({ x: actorCol, y: row }, { x: loopRight, y: row }))
      ops.push(lineOp({ x: loopRight, y: row }, { x: loopRight, y: row + SECTION_PAD }))
      ops.push(
        lineOp(
          { x: loopRight, y: row + SECTION_PAD },
          { x: actorCol, y: row + SECTION_PAD },
          { endHead: messageArrowHead(event.style) },
        ),
      )
      return
    }

    const fromCol = actorCols.get(event.fromActorId)
    const toCol = actorCols.get(event.toActorId)
    if (fromCol == null || toCol == null) return
    const row =
      eventRows.get(event.index) ??
      Math.max(MIN_EVENT_ROW_OFFSET, projection.rowForY(event.bounds.startY) + EVENT_ROW_START)
    const leftCol = Math.min(fromCol, toCol)
    const rightCol = Math.max(fromCol, toCol)
    ops.push(textOp(messageLabelStartCol(leftCol, rightCol, event.label), row - 1, event.label))
    ops.push(
      lineOp(
        { x: fromCol, y: row },
        { x: toCol, y: row },
        { stroke: messageStroke(event.style), endHead: messageArrowHead(event.style) },
      ),
    )
  })

  ops.push(...overlayOps)

  return {
    width: planWidth(ops),
    height: maxEventRow + 1,
    ops,
  }
}
