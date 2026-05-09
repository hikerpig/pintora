export function makeCanvas(width: number, height: number) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
}

export function put(canvas: string[][], x: number, y: number, ch: string) {
  if (y < 0 || y >= canvas.length) return
  if (x < 0 || x >= canvas[y].length) return
  canvas[y][x] = ch
}

export function putText(canvas: string[][], x: number, y: number, text: string) {
  Array.from(text).forEach((ch, index) => put(canvas, x + index, y, ch))
}

export function canvasToString(canvas: string[][]) {
  return canvas.map(row => row.join('').replace(/\s+$/g, '')).join('\n')
}

export function strokeRect(canvas: string[][], cols: [number, number], rows: [number, number]) {
  const [left, right] = cols
  const [top, bottom] = rows
  put(canvas, left, top, '┌')
  put(canvas, right, top, '┐')
  put(canvas, left, bottom, '└')
  put(canvas, right, bottom, '┘')
  for (let x = left + 1; x < right; x++) {
    put(canvas, x, top, '─')
    put(canvas, x, bottom, '─')
  }
  for (let y = top + 1; y < bottom; y++) {
    put(canvas, left, y, '│')
    put(canvas, right, y, '│')
  }
}

export function fillCols(canvas: string[][], cols: [number, number], rows: [number, number], glyph: string) {
  for (let y = rows[0]; y <= rows[1]; y++) {
    for (let x = cols[0]; x <= cols[1]; x++) put(canvas, x, y, glyph)
  }
}
