import { resolveDiagonalGlyph, resolveLineGlyph } from './glyph'
import { Charset, DIAGONAL_BACKWARD, DIAGONAL_FORWARD, DIR_E, DIR_N, DIR_S, DIR_W } from './types'

type GridCell = {
  text: string | null
  textContinuation: boolean
  priority: number
  lineMask: number
  diagonalMask: number
}

export class TextGrid {
  private readonly cells: GridCell[]
  private readonly trimRight: boolean

  constructor(
    readonly cols: number,
    readonly rows: number,
    private readonly charset: Charset,
    trimRight = true,
  ) {
    this.trimRight = trimRight
    this.cells = Array.from({ length: cols * rows }, () => ({
      text: null,
      textContinuation: false,
      priority: 0,
      lineMask: 0,
      diagonalMask: 0,
    }))
  }

  private getIndex(col: number, row: number): number {
    return row * this.cols + col
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows
  }

  addLineConnection(col0: number, row0: number, col1: number, row1: number, priority = 1): void {
    if (!this.inBounds(col0, row0) && !this.inBounds(col1, row1)) return

    const dx = col1 - col0
    const dy = row1 - row0
    if (dx === 0 && dy === 0) return

    const cell0 = this.inBounds(col0, row0) ? this.cells[this.getIndex(col0, row0)] : null
    const cell1 = this.inBounds(col1, row1) ? this.cells[this.getIndex(col1, row1)] : null

    const isOrthogonal = dx === 0 || dy === 0
    if (isOrthogonal) {
      if (cell0 && cell0.priority <= priority) {
        if (dx > 0) cell0.lineMask |= DIR_E
        if (dx < 0) cell0.lineMask |= DIR_W
        if (dy > 0) cell0.lineMask |= DIR_S
        if (dy < 0) cell0.lineMask |= DIR_N
        cell0.priority = Math.max(cell0.priority, priority)
      }
      if (cell1 && cell1.priority <= priority) {
        if (dx > 0) cell1.lineMask |= DIR_W
        if (dx < 0) cell1.lineMask |= DIR_E
        if (dy > 0) cell1.lineMask |= DIR_N
        if (dy < 0) cell1.lineMask |= DIR_S
        cell1.priority = Math.max(cell1.priority, priority)
      }
      return
    }

    const diagonalBit = dx * dy > 0 ? DIAGONAL_BACKWARD : DIAGONAL_FORWARD
    if (cell0 && cell0.priority <= priority) {
      cell0.diagonalMask |= diagonalBit
      cell0.priority = Math.max(cell0.priority, priority)
    }
    if (cell1 && cell1.priority <= priority) {
      cell1.diagonalMask |= diagonalBit
      cell1.priority = Math.max(cell1.priority, priority)
    }
  }

  setText(col: number, row: number, text: string, priority = 3): void {
    if (!this.inBounds(col, row)) return
    const cell = this.cells[this.getIndex(col, row)]
    if (cell.priority > priority) return
    cell.text = text
    cell.textContinuation = false
    cell.priority = priority
  }

  setTextContinuation(col: number, row: number, priority = 3): void {
    if (!this.inBounds(col, row)) return
    const cell = this.cells[this.getIndex(col, row)]
    if (cell.priority > priority) return
    cell.text = ''
    cell.textContinuation = true
    cell.priority = priority
  }

  getGlyphAt(col: number, row: number): string {
    if (!this.inBounds(col, row)) return ' '
    const cell = this.cells[this.getIndex(col, row)]
    if (cell.text !== null) {
      return cell.textContinuation ? ' ' : cell.text
    }
    if (cell.lineMask) {
      return resolveLineGlyph(cell.lineMask, this.charset)
    }
    if (cell.diagonalMask) {
      return resolveDiagonalGlyph(cell.diagonalMask, this.charset)
    }
    return ' '
  }

  toString(trimRight = this.trimRight): string {
    const lines: string[] = []
    for (let row = 0; row < this.rows; row++) {
      const chars: string[] = []
      for (let col = 0; col < this.cols; col++) {
        chars.push(this.getGlyphAt(col, row))
      }
      let line = chars.join('')
      if (trimRight) {
        line = line.replace(/\s+$/g, '')
      }
      lines.push(line)
    }
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
    }
    return lines.join('\n')
  }
}
