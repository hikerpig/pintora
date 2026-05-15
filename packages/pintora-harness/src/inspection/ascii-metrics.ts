import type { TextDiagramLineOp, TextDiagramOp, TextDiagramPlan, TextDiagramTextOp } from '@pintora/core'

export type AsciiMetricSnapshot = {
  lineCount: number
  maxDisplayWidth: number
  trailingWhitespaceLineCount: number
  boxCornerCounts: Record<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', number>
  plan: null | {
    width: number
    height: number
    opCount: number
    textOpCount: number
    rectOpCount: number
    lineOpCount: number
    adjacentLineJoinCount: number
    opOutOfBoundsCount: number
    switchHeadIntrusionCount: number
    textLineConflictCount: number
  }
}

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (isWideChar(ch) ? 2 : 1), 0)
}

function isWideChar(ch: string) {
  return /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\uff01-\uff60\uffe0-\uffe6]/u.test(ch)
}

function alignedTextX(op: TextDiagramTextOp) {
  if (op.align === 'center') return op.x - Math.floor(widthOf(op.text) / 2)
  if (op.align === 'right') return op.x - widthOf(op.text) + 1
  return op.x
}

function pointKey(x: number, y: number) {
  return `${x},${y}`
}

function collectLineCells(op: TextDiagramLineOp) {
  const cells = new Set<string>()
  if (op.from.y === op.to.y) {
    const left = Math.min(op.from.x, op.to.x)
    const right = Math.max(op.from.x, op.to.x)
    for (let x = left; x <= right; x++) cells.add(pointKey(x, op.from.y))
  } else if (op.from.x === op.to.x) {
    const top = Math.min(op.from.y, op.to.y)
    const bottom = Math.max(op.from.y, op.to.y)
    for (let y = top; y <= bottom; y++) cells.add(pointKey(op.from.x, y))
  }
  return cells
}

function collectTextCells(op: TextDiagramTextOp) {
  const cells = new Set<string>()
  const startX = alignedTextX(op)
  let cursorX = startX
  Array.from(op.text).forEach(ch => {
    const width = widthOf(ch)
    for (let offset = 0; offset < width; offset++) cells.add(pointKey(cursorX + offset, op.y))
    cursorX += width
  })
  return cells
}

function isOpOutOfBounds(op: TextDiagramOp, plan: TextDiagramPlan) {
  if (op.type === 'text') {
    const x = alignedTextX(op)
    return x < 0 || op.y < 0 || x + widthOf(op.text) > plan.width || op.y >= plan.height
  }
  if (op.type === 'line') {
    return (
      op.from.x < 0 ||
      op.from.y < 0 ||
      op.to.x < 0 ||
      op.to.y < 0 ||
      op.from.x >= plan.width ||
      op.to.x >= plan.width ||
      op.from.y >= plan.height ||
      op.to.y >= plan.height
    )
  }
  return op.x < 0 || op.y < 0 || op.x + op.width > plan.width || op.y + op.height > plan.height
}

function countTextLineConflicts(plan: TextDiagramPlan) {
  const lineCells = new Set<string>()
  plan.ops.forEach(op => {
    if (op.type !== 'line') return
    collectLineCells(op).forEach(cell => lineCells.add(cell))
  })

  let conflicts = 0
  plan.ops.forEach(op => {
    if (op.type !== 'text') return
    collectTextCells(op).forEach(cell => {
      if (lineCells.has(cell)) conflicts += 1
    })
  })
  return conflicts
}

function countSwitchHeadIntrusions(plan: TextDiagramPlan) {
  const verticalLineCells = new Set<string>()
  plan.ops.forEach(op => {
    if (op.type !== 'line' || op.from.x !== op.to.x) return
    collectLineCells(op).forEach(cell => verticalLineCells.add(cell))
  })

  return plan.ops.filter(
    op => op.type === 'text' && /^< .+ >$/.test(op.text) && verticalLineCells.has(pointKey(op.x, op.y + 1)),
  ).length
}

function countAdjacentLineJoins(text: string) {
  return text.split(/\n/).reduce((count, line) => {
    const leftCornerLike = line.match(/[│┆][─╌]{2,}/g)?.length || 0
    const rightCornerLike = line.match(/[─╌]{2,}[│┆]/g)?.length || 0
    return count + leftCornerLike + rightCornerLike
  }, 0)
}

export function buildAsciiMetrics(text: string, plan?: TextDiagramPlan | null): AsciiMetricSnapshot {
  const lines = text.split(/\n/)
  const boxCornerCounts = {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
  }

  lines.forEach(line => {
    Array.from(line).forEach(ch => {
      if (ch === '┌') boxCornerCounts.topLeft += 1
      else if (ch === '┐') boxCornerCounts.topRight += 1
      else if (ch === '└') boxCornerCounts.bottomLeft += 1
      else if (ch === '┘') boxCornerCounts.bottomRight += 1
    })
  })

  return {
    lineCount: lines.length,
    maxDisplayWidth: lines.reduce((max, line) => Math.max(max, widthOf(line)), 0),
    trailingWhitespaceLineCount: lines.filter(line => /\s+$/.test(line)).length,
    boxCornerCounts,
    plan: plan
      ? {
          width: plan.width,
          height: plan.height,
          opCount: plan.ops.length,
          textOpCount: plan.ops.filter(op => op.type === 'text').length,
          rectOpCount: plan.ops.filter(op => op.type === 'rect').length,
          lineOpCount: plan.ops.filter(op => op.type === 'line').length,
          adjacentLineJoinCount: countAdjacentLineJoins(text),
          opOutOfBoundsCount: plan.ops.filter(op => isOpOutOfBounds(op, plan)).length,
          switchHeadIntrusionCount: countSwitchHeadIntrusions(plan),
          textLineConflictCount: countTextLineConflicts(plan),
        }
      : null,
  }
}
