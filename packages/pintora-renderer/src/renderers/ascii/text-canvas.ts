export type LineDirection = 'up' | 'right' | 'down' | 'left'

const LINE_GLYPHS = new Map<string, string>([
  ['left', '─'],
  ['right', '─'],
  ['up', '│'],
  ['down', '│'],
  ['left,right', '─'],
  ['down,up', '│'],
  ['down,right', '┌'],
  ['down,left', '┐'],
  ['right,up', '└'],
  ['left,up', '┘'],
  ['down,left,right', '┬'],
  ['left,right,up', '┴'],
  ['down,right,up', '├'],
  ['down,left,up', '┤'],
  ['down,left,right,up', '┼'],
])

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

function keyOf(directions: LineDirection[]) {
  return Array.from(new Set(directions)).sort().join(',')
}

const canvasLineDirections = new WeakMap<string[][], Map<string, Set<LineDirection>>>()

function pointKey(x: number, y: number) {
  return `${x},${y}`
}

function directionsAt(canvas: string[][], x: number, y: number) {
  const key = pointKey(x, y)
  const map = canvasLineDirections.get(canvas)
  let directions = map?.get(key)
  if (!directions) {
    directions = new Set(GLYPH_DIRECTIONS.get(canvas[y][x]) || [])
  }
  return { directions, key, map }
}

function mergeLineGlyph(canvas: string[][], x: number, y: number, directions: LineDirection[]) {
  const state = directionsAt(canvas, x, y)
  directions.forEach(direction => state.directions.add(direction))
  const glyph = LINE_GLYPHS.get(keyOf(Array.from(state.directions)))
  if (!glyph) return canvas[y][x]
  state.map?.set(state.key, state.directions)
  return glyph
}

export function makeCanvas(width: number, height: number) {
  const canvas = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
  canvasLineDirections.set(canvas, new Map())
  return canvas
}

export function put(canvas: string[][], x: number, y: number, ch: string) {
  if (y < 0 || y >= canvas.length) return
  if (x < 0 || x >= canvas[y].length) return
  canvas[y][x] = ch
  canvasLineDirections.get(canvas)?.delete(pointKey(x, y))
}

export function putLine(canvas: string[][], x: number, y: number, directions: LineDirection[]) {
  if (y < 0 || y >= canvas.length) return
  if (x < 0 || x >= canvas[y].length) return
  canvas[y][x] = mergeLineGlyph(canvas, x, y, directions)
}

export function putText(canvas: string[][], x: number, y: number, text: string) {
  Array.from(text).forEach((ch, index) => put(canvas, x + index, y, ch))
}

export function canvasToString(canvas: string[][]) {
  return canvas.map(row => row.join('').replace(/\s+$/g, '')).join('\n')
}

export function strokeRect(
  canvas: string[][],
  cols: [number, number],
  rows: [number, number],
  stroke: 'solid' | 'dashed' = 'solid',
) {
  const [left, right] = cols
  const [top, bottom] = rows
  put(canvas, left, top, '┌')
  put(canvas, right, top, '┐')
  put(canvas, left, bottom, '└')
  put(canvas, right, bottom, '┘')
  const horizontal = stroke === 'dashed' ? '╌' : '─'
  const vertical = stroke === 'dashed' ? '┆' : '│'
  for (let x = left + 1; x < right; x++) {
    put(canvas, x, top, horizontal)
    put(canvas, x, bottom, horizontal)
  }
  for (let y = top + 1; y < bottom; y++) {
    put(canvas, left, y, vertical)
    put(canvas, right, y, vertical)
  }
}

export function fillCols(canvas: string[][], cols: [number, number], rows: [number, number], glyph: string) {
  for (let y = rows[0]; y <= rows[1]; y++) {
    for (let x = cols[0]; x <= cols[1]; x++) put(canvas, x, y, glyph)
  }
}
