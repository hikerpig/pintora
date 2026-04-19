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
