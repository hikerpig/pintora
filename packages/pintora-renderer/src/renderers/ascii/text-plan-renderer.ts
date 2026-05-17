import type { TextDiagramArrowHead, TextDiagramLineOp, TextDiagramPlan, TextDiagramTextOp } from '@pintora/core'
import { canvasToString, fillCols, LineDirection, makeCanvas, put, putLine, putText, strokeRect } from './text-canvas'

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

function alignedTextX(op: TextDiagramTextOp) {
  if (op.align === 'center') return op.x - Math.floor(widthOf(op.text) / 2)
  if (op.align === 'right') return op.x - widthOf(op.text) + 1
  return op.x
}

function horizontalHead(head: TextDiagramArrowHead | undefined, direction: 1 | -1) {
  if (head === 'open') return direction > 0 ? '▷' : '◁'
  if (head === 'filled') return direction > 0 ? '▶' : '◀'
}

function verticalHead(head: TextDiagramArrowHead | undefined, direction: 1 | -1) {
  if (head === 'open') return direction > 0 ? '▽' : '△'
  if (head === 'filled') return direction > 0 ? '▼' : '▲'
}

function drawHorizontalLine(canvas: string[][], op: TextDiagramLineOp) {
  const y = op.from.y
  const direction: 1 | -1 = op.to.x >= op.from.x ? 1 : -1
  const inverse: 1 | -1 = direction === 1 ? -1 : 1
  const left = Math.min(op.from.x, op.to.x)
  const right = Math.max(op.from.x, op.to.x)

  if (op.stroke === 'dashed') {
    for (let x = left; x <= right; x++) put(canvas, x, y, '╌')
  } else {
    for (let x = left; x <= right; x++) {
      const directions: LineDirection[] = x === left ? ['right'] : x === right ? ['left'] : ['left', 'right']
      putLine(canvas, x, y, directions)
    }
  }

  const startHead = horizontalHead(op.startHead, inverse)
  const endHead = horizontalHead(op.endHead, direction)
  if (startHead) put(canvas, op.from.x, y, startHead)
  if (endHead) put(canvas, op.to.x, y, endHead)
}

function drawVerticalLine(canvas: string[][], op: TextDiagramLineOp) {
  const x = op.from.x
  const direction: 1 | -1 = op.to.y >= op.from.y ? 1 : -1
  const inverse: 1 | -1 = direction === 1 ? -1 : 1
  const top = Math.min(op.from.y, op.to.y)
  const bottom = Math.max(op.from.y, op.to.y)

  if (op.stroke === 'dashed') {
    for (let y = top; y <= bottom; y++) put(canvas, x, y, '┆')
  } else {
    for (let y = top; y <= bottom; y++) {
      const directions: LineDirection[] = y === top ? ['down'] : y === bottom ? ['up'] : ['up', 'down']
      putLine(canvas, x, y, directions)
    }
  }

  const startHead = verticalHead(op.startHead, inverse)
  const endHead = verticalHead(op.endHead, direction)
  if (startHead) put(canvas, x, op.from.y, startHead)
  if (endHead) put(canvas, x, op.to.y, endHead)
}

function drawLine(canvas: string[][], op: TextDiagramLineOp) {
  if (op.from.y === op.to.y) {
    drawHorizontalLine(canvas, op)
    return
  }
  if (op.from.x === op.to.x) {
    drawVerticalLine(canvas, op)
    return
  }
  throw new Error('TextDiagramPlan line ops must be axis-aligned')
}

export function renderTextDiagramPlan(plan: TextDiagramPlan) {
  const canvas = makeCanvas(plan.width, plan.height)
  const textOps: TextDiagramTextOp[] = []

  plan.ops.forEach(op => {
    if (op.type === 'text') {
      textOps.push(op)
    } else if (op.type === 'line') {
      drawLine(canvas, op)
    } else if (op.type === 'rect') {
      strokeRect(canvas, [op.x, op.x + op.width - 1], [op.y, op.y + op.height - 1], op.stroke)
    } else if (op.type === 'fill') {
      fillCols(canvas, [op.x, op.x + op.width - 1], [op.y, op.y + op.height - 1], op.char)
    }
  })
  textOps.forEach(op => {
    putText(canvas, alignedTextX(op), op.y, op.text)
  })

  return canvasToString(canvas)
}
