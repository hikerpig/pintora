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
    textRenderMismatchCount: number
    textLineConflictCount: number
    lineCornerMissingCount: number
  }
}

type LineDirection = 'up' | 'right' | 'down' | 'left'

const GLYPH_DIRECTIONS = new Map<string, LineDirection[]>([
  ['─', ['left', 'right']],
  ['│', ['up', 'down']],
  ['┌', ['right', 'down']],
  ['┐', ['left', 'down']],
  ['└', ['right', 'up']],
  ['┘', ['left', 'up']],
  ['┬', ['left', 'right', 'down']],
  ['┴', ['left', 'right', 'up']],
  ['├', ['up', 'right', 'down']],
  ['┤', ['up', 'left', 'down']],
  ['┼', ['up', 'right', 'down', 'left']],
])

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

function collectTextCellChars(op: TextDiagramTextOp) {
  const cells = new Map<string, string>()
  const startX = alignedTextX(op)
  let cursorX = startX
  Array.from(op.text).forEach(ch => {
    const width = widthOf(ch)
    for (let offset = 0; offset < width; offset++) cells.set(pointKey(cursorX + offset, op.y), ch)
    cursorX += width
  })
  return cells
}

function collectRenderedCells(text: string) {
  const cells = new Map<string, string>()
  text.split(/\n/).forEach((line, y) => {
    let cursorX = 0
    Array.from(line).forEach(ch => {
      const width = widthOf(ch)
      for (let offset = 0; offset < width; offset++) cells.set(pointKey(cursorX + offset, y), ch)
      cursorX += width
    })
  })
  return cells
}

function addDirection(map: Map<string, Set<LineDirection>>, x: number, y: number, direction: LineDirection) {
  const key = pointKey(x, y)
  let directions = map.get(key)
  if (!directions) {
    directions = new Set()
    map.set(key, directions)
  }
  directions.add(direction)
}

function collectSolidLineDirections(plan: TextDiagramPlan) {
  const directionsByCell = new Map<string, Set<LineDirection>>()
  plan.ops.forEach(op => {
    if (op.type !== 'line' || op.stroke === 'dashed') return

    const skipStart = Boolean(op.startHead)
    const skipEnd = Boolean(op.endHead)
    if (op.from.y === op.to.y) {
      const y = op.from.y
      const left = Math.min(op.from.x, op.to.x)
      const right = Math.max(op.from.x, op.to.x)
      for (let x = left; x <= right; x++) {
        const isStart = x === op.from.x
        const isEnd = x === op.to.x
        if ((skipStart && isStart) || (skipEnd && isEnd)) continue
        if (x > left) addDirection(directionsByCell, x, y, 'left')
        if (x < right) addDirection(directionsByCell, x, y, 'right')
      }
    } else if (op.from.x === op.to.x) {
      const x = op.from.x
      const top = Math.min(op.from.y, op.to.y)
      const bottom = Math.max(op.from.y, op.to.y)
      for (let y = top; y <= bottom; y++) {
        const isStart = y === op.from.y
        const isEnd = y === op.to.y
        if ((skipStart && isStart) || (skipEnd && isEnd)) continue
        if (y > top) addDirection(directionsByCell, x, y, 'up')
        if (y < bottom) addDirection(directionsByCell, x, y, 'down')
      }
    }
  })
  return directionsByCell
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

function countTextLineConflicts(text: string, plan: TextDiagramPlan) {
  const lineCells = new Set<string>()
  const renderedCells = collectRenderedCells(text)
  plan.ops.forEach(op => {
    if (op.type !== 'line') return
    collectLineCells(op).forEach(cell => lineCells.add(cell))
  })

  let conflicts = 0
  plan.ops.forEach(op => {
    if (op.type !== 'text') return
    collectTextCellChars(op).forEach((ch, cell) => {
      if (lineCells.has(cell) && renderedCells.get(cell) !== ch) conflicts += 1
    })
  })
  return conflicts
}

function countTextRenderMismatches(text: string, plan: TextDiagramPlan) {
  const renderedCells = collectRenderedCells(text)
  let mismatches = 0
  plan.ops.forEach(op => {
    if (op.type !== 'text') return
    collectTextCellChars(op).forEach((ch, cell) => {
      if (renderedCells.get(cell) !== ch) mismatches += 1
    })
  })
  return mismatches
}

function hasHorizontalDirection(directions: Set<LineDirection>) {
  return directions.has('left') || directions.has('right')
}

function hasVerticalDirection(directions: Set<LineDirection>) {
  return directions.has('up') || directions.has('down')
}

function renderedGlyphHasDirections(ch: string | undefined, expected: Set<LineDirection>) {
  if (!ch) return false
  const renderedDirections = new Set(GLYPH_DIRECTIONS.get(ch) || [])
  return Array.from(expected).every(direction => renderedDirections.has(direction))
}

function countLineCornerMissing(text: string, plan: TextDiagramPlan) {
  const renderedCells = collectRenderedCells(text)
  let missing = 0
  collectSolidLineDirections(plan).forEach((directions, cell) => {
    if (!hasHorizontalDirection(directions) || !hasVerticalDirection(directions)) return
    if (!renderedGlyphHasDirections(renderedCells.get(cell), directions)) missing += 1
  })
  return missing
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
    const leftCornerLike = line.match(/(?:│─{2,}|┆╌{2,})/g)?.length || 0
    const rightCornerLike = line.match(/(?:─{2,}│|╌{2,}┆)/g)?.length || 0
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
          textRenderMismatchCount: countTextRenderMismatches(text, plan),
          textLineConflictCount: countTextLineConflicts(text, plan),
          lineCornerMissingCount: countLineCornerMissing(text, plan),
        }
      : null,
  }
}
