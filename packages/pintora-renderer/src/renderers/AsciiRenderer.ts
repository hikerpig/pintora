import { configApi, GraphicsIR, GrahpicEventHandler, Mark, PathCommand, PintoraConfig } from '@pintora/core'
import { IRenderer } from '../type'
import { noop } from '../util'

type TextCharset = 'unicode' | 'ascii'

type TextRendererOptions = {
  charset: TextCharset
  cellWidth: number
  cellHeight: number
  trimRight: boolean
  ansi: boolean
}

type Matrix = number[]

type Point = {
  x: number
  y: number
}

type ParsedPathCommand = {
  cmd: string
  values: number[]
}

type GridCell = {
  text: string | null
  textContinuation: boolean
  priority: number
  lineMask: number
  diagonalMask: number
}

const DIR_N = 1
const DIR_E = 2
const DIR_S = 4
const DIR_W = 8

const DIAGONAL_FORWARD = 1
const DIAGONAL_BACKWARD = 2

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1]

const PATH_PARAM_COUNTS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
}

class TextGrid {
  private cells: GridCell[]

  constructor(
    readonly cols: number,
    readonly rows: number,
    private readonly charset: TextCharset,
    private readonly trimRight: boolean,
  ) {
    this.cells = Array.from({ length: cols * rows }, () => {
      return {
        text: null,
        textContinuation: false,
        priority: 0,
        lineMask: 0,
        diagonalMask: 0,
      }
    })
  }

  private index(col: number, row: number) {
    return row * this.cols + col
  }

  inBounds(col: number, row: number) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows
  }

  private getCell(col: number, row: number): GridCell | null {
    if (!this.inBounds(col, row)) return null
    return this.cells[this.index(col, row)]
  }

  addLineConnection(col0: number, row0: number, col1: number, row1: number, priority = 1) {
    if (!this.inBounds(col0, row0) && !this.inBounds(col1, row1)) return

    const dx = col1 - col0
    const dy = row1 - row0

    if (dx === 0 && dy === 0) return

    const cell0 = this.getCell(col0, row0)
    const cell1 = this.getCell(col1, row1)

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

  setText(col: number, row: number, text: string, priority = 3) {
    const cell = this.getCell(col, row)
    if (!cell) return
    if (cell.priority > priority) return

    cell.text = text
    cell.textContinuation = false
    cell.priority = priority
  }

  setTextContinuation(col: number, row: number, priority = 3) {
    const cell = this.getCell(col, row)
    if (!cell) return
    if (cell.priority > priority) return

    cell.text = ''
    cell.textContinuation = true
    cell.priority = priority
  }

  toString() {
    const lines: string[] = []
    for (let row = 0; row < this.rows; row++) {
      const chars: string[] = []
      for (let col = 0; col < this.cols; col++) {
        const cell = this.cells[this.index(col, row)]
        if (cell.text !== null) {
          chars.push(cell.textContinuation ? ' ' : cell.text)
          continue
        }

        if (cell.lineMask) {
          chars.push(resolveLineGlyph(cell.lineMask, this.charset))
          continue
        }

        if (cell.diagonalMask) {
          chars.push(resolveDiagonalGlyph(cell.diagonalMask, this.charset))
          continue
        }

        chars.push(' ')
      }
      let line = chars.join('')
      if (this.trimRight) {
        line = line.replace(/\s+$/g, '')
      }
      lines.push(line)
    }

    while (lines.length && lines[lines.length - 1] === '') {
      lines.pop()
    }

    return lines.join('\n')
  }
}

function resolveLineGlyph(mask: number, charset: TextCharset) {
  if (charset === 'ascii') {
    if (mask === DIR_N || mask === DIR_S || mask === (DIR_N | DIR_S)) return '|'
    if (mask === DIR_E || mask === DIR_W || mask === (DIR_E | DIR_W)) return '-'
    return '+'
  }

  switch (mask) {
    case DIR_N:
    case DIR_S:
    case DIR_N | DIR_S:
      return '│'
    case DIR_E:
    case DIR_W:
    case DIR_E | DIR_W:
      return '─'
    case DIR_E | DIR_S:
      return '┌'
    case DIR_W | DIR_S:
      return '┐'
    case DIR_E | DIR_N:
      return '└'
    case DIR_W | DIR_N:
      return '┘'
    case DIR_N | DIR_S | DIR_E:
      return '├'
    case DIR_N | DIR_S | DIR_W:
      return '┤'
    case DIR_E | DIR_W | DIR_S:
      return '┬'
    case DIR_E | DIR_W | DIR_N:
      return '┴'
    case DIR_N | DIR_E | DIR_S | DIR_W:
      return '┼'
    default:
      return '·'
  }
}

function resolveDiagonalGlyph(mask: number, charset: TextCharset) {
  if (mask === DIAGONAL_FORWARD) return '/'
  if (mask === DIAGONAL_BACKWARD) return '\\'
  return charset === 'ascii' ? 'x' : '╳'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function multiplyMat3(a: Matrix, b: Matrix): Matrix {
  const out = Array.from({ length: 9 }, () => 0)
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      out[col * 3 + row] =
        a[0 * 3 + row] * b[col * 3 + 0] + a[1 * 3 + row] * b[col * 3 + 1] + a[2 * 3 + row] * b[col * 3 + 2]
    }
  }
  return out
}

function toMatrix(input: unknown): Matrix {
  if (!input) return IDENTITY_MATRIX
  const arr = Array.from(input as ArrayLike<number>)
  if (arr.length < 9) return IDENTITY_MATRIX
  return arr.slice(0, 9)
}

function transformPoint(point: Point, matrix: Matrix) {
  return {
    x: matrix[0] * point.x + matrix[3] * point.y + matrix[6],
    y: matrix[1] * point.x + matrix[4] * point.y + matrix[7],
  }
}

function distance(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function estimatePolylineLength(points: Point[]) {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i])
  }
  return length
}

function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, maxStep: number) {
  const estimated = estimatePolylineLength([p0, p1, p2, p3])
  const steps = Math.max(4, Math.ceil(estimated / Math.max(maxStep, 1)))
  const points: Point[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const inv = 1 - t
    const x =
      inv * inv * inv * p0.x +
      3 * inv * inv * t * p1.x +
      3 * inv * t * t * p2.x +
      t * t * t * p3.x
    const y =
      inv * inv * inv * p0.y +
      3 * inv * inv * t * p1.y +
      3 * inv * t * t * p2.y +
      t * t * t * p3.y
    points.push({ x, y })
  }

  return points
}

function sampleQuadraticBezier(p0: Point, p1: Point, p2: Point, maxStep: number) {
  const estimated = estimatePolylineLength([p0, p1, p2])
  const steps = Math.max(4, Math.ceil(estimated / Math.max(maxStep, 1)))
  const points: Point[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const inv = 1 - t
    const x = inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x
    const y = inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y
    points.push({ x, y })
  }

  return points
}

function calcVectorAngle(ux: number, uy: number, vx: number, vy: number) {
  const dot = ux * vx + uy * vy
  const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
  if (len === 0) return 0
  let angle = Math.acos(clamp(dot / len, -1, 1))
  if (ux * vy - uy * vx < 0) angle = -angle
  return angle
}

function sampleArc(start: Point, end: Point, args: number[]) {
  let [rx, ry, xAxisRotation, largeArcFlag, sweepFlag] = args

  rx = Math.abs(rx)
  ry = Math.abs(ry)

  if (!rx || !ry) return [start, end]

  const phi = (xAxisRotation * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  const dx2 = (start.x - end.x) / 2
  const dy2 = (start.y - end.y) / 2

  const x1p = cosPhi * dx2 + sinPhi * dy2
  const y1p = -sinPhi * dx2 + cosPhi * dy2

  let rxSq = rx * rx
  let rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p

  const lambda = x1pSq / rxSq + y1pSq / rySq
  if (lambda > 1) {
    const scale = Math.sqrt(lambda)
    rx *= scale
    ry *= scale
    rxSq = rx * rx
    rySq = ry * ry
  }

  const denom = rxSq * y1pSq + rySq * x1pSq
  if (denom === 0) return [start, end]

  const sign = largeArcFlag === sweepFlag ? -1 : 1
  const sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / denom)
  const coef = sign * Math.sqrt(sq)

  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx

  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2

  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry

  const theta1 = calcVectorAngle(1, 0, ux, uy)
  let deltaTheta = calcVectorAngle(ux, uy, vx, vy)

  if (!sweepFlag && deltaTheta > 0) deltaTheta -= Math.PI * 2
  if (sweepFlag && deltaTheta < 0) deltaTheta += Math.PI * 2

  const segmentCount = Math.max(6, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 10)))
  const points: Point[] = [start]

  for (let i = 1; i <= segmentCount; i++) {
    const theta = theta1 + (deltaTheta * i) / segmentCount
    const x = cosPhi * rx * Math.cos(theta) - sinPhi * ry * Math.sin(theta) + cx
    const y = sinPhi * rx * Math.cos(theta) + cosPhi * ry * Math.sin(theta) + cy
    points.push({ x, y })
  }

  return points
}

function tokenizePath(path: string) {
  const tokens = path.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
  return tokens || []
}

function isCommandToken(token: string) {
  return /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token)
}

function parsePathString(path: string): ParsedPathCommand[] {
  const tokens = tokenizePath(path)
  const output: ParsedPathCommand[] = []

  let index = 0
  let currentCommand = ''

  while (index < tokens.length) {
    const token = tokens[index]
    if (isCommandToken(token)) {
      currentCommand = token
      index++
      if (currentCommand.toUpperCase() === 'Z') {
        output.push({ cmd: currentCommand, values: [] })
        continue
      }
    }

    if (!currentCommand) {
      index++
      continue
    }

    const upper = currentCommand.toUpperCase()
    const paramCount = PATH_PARAM_COUNTS[upper]
    if (typeof paramCount === 'undefined') {
      index++
      continue
    }

    if (upper === 'M') {
      let first = true
      while (index + 1 < tokens.length && !isCommandToken(tokens[index]) && !isCommandToken(tokens[index + 1])) {
        const values = [Number(tokens[index]), Number(tokens[index + 1])]
        output.push({ cmd: first ? currentCommand : currentCommand === 'm' ? 'l' : 'L', values })
        first = false
        index += 2
      }
      continue
    }

    if (paramCount === 0) {
      output.push({ cmd: currentCommand, values: [] })
      continue
    }

    while (index + paramCount - 1 < tokens.length && !isCommandToken(tokens[index])) {
      const values: number[] = []
      let valid = true
      for (let i = 0; i < paramCount; i++) {
        const nextToken = tokens[index + i]
        if (isCommandToken(nextToken)) {
          valid = false
          break
        }
        values.push(Number(nextToken))
      }
      if (!valid) break
      output.push({ cmd: currentCommand, values })
      index += paramCount
    }
  }

  return output
}

function toParsedPathCommands(path: string | PathCommand[]) {
  if (Array.isArray(path)) {
    return path.map(command => {
      const [cmd, ...rest] = command as [string, ...number[]]
      return {
        cmd,
        values: rest,
      }
    })
  }
  return parsePathString(path)
}

function calcTextTopLeft(
  x: number,
  y: number,
  width: number,
  height: number,
  textAlign: string = 'left',
  textBaseline: string = 'alphabetic',
) {
  let left = x
  if (textAlign === 'center') {
    left = x - width / 2
  } else if (textAlign === 'right' || textAlign === 'end') {
    left = x - width
  }

  let top = y
  if (textBaseline === 'middle') {
    top = y - height / 2
  } else if (textBaseline === 'top' || textBaseline === 'hanging') {
    top = y
  } else {
    top = y - height
  }

  return { left, top }
}

function isCombiningCodePoint(codePoint: number) {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  )
}

function isFullwidthCodePoint(codePoint: number) {
  if (codePoint < 0x1100) {
    return false
  }

  return (
    codePoint <= 0x115f ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
    (codePoint >= 0x3040 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  )
}

function charWidth(char: string) {
  const codePoint = char.codePointAt(0)
  if (!codePoint) return 0

  if ((codePoint >= 0 && codePoint <= 31) || (codePoint >= 0x7f && codePoint <= 0x9f)) {
    return 0
  }

  if (codePoint === 0x200d || (codePoint >= 0xfe00 && codePoint <= 0xfe0f) || isCombiningCodePoint(codePoint)) {
    return 0
  }

  return isFullwidthCodePoint(codePoint) ? 2 : 1
}

function textDisplayWidth(text: string) {
  let width = 0
  for (const char of Array.from(text)) {
    width += charWidth(char)
  }
  return width
}

export class AsciiRenderer implements IRenderer {
  private container: HTMLElement | null = null
  private rootElement: HTMLPreElement | null = null
  private textContent = ''

  constructor(private readonly ir: GraphicsIR) {}

  setContainer(container: HTMLElement) {
    this.container = container

    const doc = container.ownerDocument || ((globalThis as any).document as Document)
    if (doc) {
      this.rootElement = doc.createElement('pre')
      this.rootElement.style.margin = '0'
      this.rootElement.style.whiteSpace = 'pre'
      this.rootElement.style.fontFamily = 'monospace'
      this.rootElement.style.lineHeight = '1'
    }

    return this
  }

  render() {
    const options = this.getOptions()
    const cols = Math.max(1, Math.round(this.ir.width / options.cellWidth) + 2)
    const rows = Math.max(1, Math.round(this.ir.height / options.cellHeight) + 2)

    const grid = new TextGrid(cols, rows, options.charset, options.trimRight)

    this.renderMark(this.ir.mark, grid, IDENTITY_MATRIX, options)
    this.textContent = grid.toString()

    if (this.rootElement) {
      this.rootElement.textContent = this.textContent
    }

    if (this.container && this.rootElement) {
      this.container.innerHTML = ''
      this.container.appendChild(this.rootElement)
    }
  }

  getRootElement(): Element {
    if (this.rootElement) return this.rootElement

    const doc = ((globalThis as any).document as Document | undefined) || undefined
    if (!doc) {
      throw new Error('AsciiRenderer requires a DOM-like document')
    }

    this.rootElement = doc.createElement('pre')
    return this.rootElement
  }

  getTextContent() {
    return this.textContent
  }

  on(_name: string, _handler: GrahpicEventHandler) {
    return noop
  }

  private getOptions(): TextRendererOptions {
    const config = configApi.getConfig<PintoraConfig>() as any
    const c = (config.core?.textRenderer || {}) as Partial<TextRendererOptions>

    return {
      charset: c.charset === 'ascii' ? 'ascii' : 'unicode',
      cellWidth: c.cellWidth && c.cellWidth > 0 ? c.cellWidth : 8,
      cellHeight: c.cellHeight && c.cellHeight > 0 ? c.cellHeight : 16,
      trimRight: c.trimRight !== false,
      ansi: false,
    }
  }

  private renderMark(mark: Mark, grid: TextGrid, parentMatrix: Matrix, options: TextRendererOptions) {
    const ownMatrix = toMatrix(mark.matrix)
    const matrix = multiplyMat3(parentMatrix, ownMatrix)

    if (mark.type === 'group') {
      mark.children.forEach(child => {
        this.renderMark(child, grid, matrix, options)
      })
      return
    }

    if (mark.type === 'symbol') {
      this.renderMark(mark.mark, grid, matrix, options)
      return
    }

    if (mark.type === 'rect') {
      const attrs = mark.attrs || {}
      const x = Number(attrs.x || 0)
      const y = Number(attrs.y || 0)
      const width = Number(attrs.width || 0)
      const height = Number(attrs.height || 0)
      const p1 = transformPoint({ x, y }, matrix)
      const p2 = transformPoint({ x: x + width, y }, matrix)
      const p3 = transformPoint({ x: x + width, y: y + height }, matrix)
      const p4 = transformPoint({ x, y: y + height }, matrix)
      this.drawLine(grid, p1, p2, options)
      this.drawLine(grid, p2, p3, options)
      this.drawLine(grid, p3, p4, options)
      this.drawLine(grid, p4, p1, options)
      return
    }

    if (mark.type === 'line') {
      const attrs = mark.attrs
      const p1 = transformPoint({ x: attrs.x1, y: attrs.y1 }, matrix)
      const p2 = transformPoint({ x: attrs.x2, y: attrs.y2 }, matrix)
      this.drawLine(grid, p1, p2, options)
      return
    }

    if (mark.type === 'polyline' || mark.type === 'polygon') {
      const points = (mark.attrs.points || []).map(point => {
        return transformPoint({ x: point[0], y: point[1] }, matrix)
      })
      for (let i = 1; i < points.length; i++) {
        this.drawLine(grid, points[i - 1], points[i], options)
      }
      if (mark.type === 'polygon' && points.length > 2) {
        this.drawLine(grid, points[points.length - 1], points[0], options)
      }
      return
    }

    if (mark.type === 'circle') {
      const attrs = mark.attrs
      const cx = Number(attrs.cx ?? attrs.x ?? 0)
      const cy = Number(attrs.cy ?? attrs.y ?? 0)
      const r = Number(attrs.r || 0)
      const points: Point[] = []
      const segments = 32
      for (let i = 0; i <= segments; i++) {
        const rad = (Math.PI * 2 * i) / segments
        const p = transformPoint(
          {
            x: cx + Math.cos(rad) * r,
            y: cy + Math.sin(rad) * r,
          },
          matrix,
        )
        points.push(p)
      }
      for (let i = 1; i < points.length; i++) {
        this.drawLine(grid, points[i - 1], points[i], options)
      }
      return
    }

    if (mark.type === 'ellipse') {
      const attrs = mark.attrs
      const cx = Number(attrs.cx ?? 0)
      const cy = Number(attrs.cy ?? 0)
      const rx = Number(attrs.rx ?? 0)
      const ry = Number(attrs.ry ?? 0)
      const points: Point[] = []
      const segments = 40
      for (let i = 0; i <= segments; i++) {
        const rad = (Math.PI * 2 * i) / segments
        const p = transformPoint(
          {
            x: cx + Math.cos(rad) * rx,
            y: cy + Math.sin(rad) * ry,
          },
          matrix,
        )
        points.push(p)
      }
      for (let i = 1; i < points.length; i++) {
        this.drawLine(grid, points[i - 1], points[i], options)
      }
      return
    }

    if (mark.type === 'path') {
      this.drawPath(grid, mark.attrs.path, matrix, options)
      return
    }

    if (mark.type === 'text') {
      this.drawText(grid, mark.attrs, matrix, options)
    }
  }

  private drawPath(grid: TextGrid, path: string | PathCommand[], matrix: Matrix, options: TextRendererOptions) {
    const parsed = toParsedPathCommands(path)

    let current: Point = { x: 0, y: 0 }
    let subpathStart: Point = { x: 0, y: 0 }
    let prevCubicControl: Point | null = null
    let prevQuadraticControl: Point | null = null
    let prevCmd = ''

    const toAbsolute = (x: number, y: number, relative: boolean) => {
      if (!relative) return { x, y }
      return {
        x: current.x + x,
        y: current.y + y,
      }
    }

    const emitPolyline = (points: Point[]) => {
      for (let i = 1; i < points.length; i++) {
        const p0 = transformPoint(points[i - 1], matrix)
        const p1 = transformPoint(points[i], matrix)
        this.drawLine(grid, p0, p1, options)
      }
    }

    for (const command of parsed) {
      const cmd = command.cmd
      const upper = cmd.toUpperCase()
      const relative = cmd !== upper

      switch (upper) {
        case 'M': {
          const p = toAbsolute(command.values[0], command.values[1], relative)
          current = p
          subpathStart = p
          prevCubicControl = null
          prevQuadraticControl = null
          break
        }
        case 'L': {
          const p = toAbsolute(command.values[0], command.values[1], relative)
          emitPolyline([current, p])
          current = p
          prevCubicControl = null
          prevQuadraticControl = null
          break
        }
        case 'H': {
          const x = relative ? current.x + command.values[0] : command.values[0]
          const p = { x, y: current.y }
          emitPolyline([current, p])
          current = p
          prevCubicControl = null
          prevQuadraticControl = null
          break
        }
        case 'V': {
          const y = relative ? current.y + command.values[0] : command.values[0]
          const p = { x: current.x, y }
          emitPolyline([current, p])
          current = p
          prevCubicControl = null
          prevQuadraticControl = null
          break
        }
        case 'C': {
          const c1 = toAbsolute(command.values[0], command.values[1], relative)
          const c2 = toAbsolute(command.values[2], command.values[3], relative)
          const p = toAbsolute(command.values[4], command.values[5], relative)
          emitPolyline(sampleCubicBezier(current, c1, c2, p, Math.max(options.cellWidth, options.cellHeight)))
          current = p
          prevCubicControl = c2
          prevQuadraticControl = null
          break
        }
        case 'S': {
          const reflected =
            prevCmd === 'C' || prevCmd === 'S'
              ? {
                  x: current.x * 2 - (prevCubicControl?.x ?? current.x),
                  y: current.y * 2 - (prevCubicControl?.y ?? current.y),
                }
              : current

          const c2 = toAbsolute(command.values[0], command.values[1], relative)
          const p = toAbsolute(command.values[2], command.values[3], relative)
          emitPolyline(sampleCubicBezier(current, reflected, c2, p, Math.max(options.cellWidth, options.cellHeight)))
          current = p
          prevCubicControl = c2
          prevQuadraticControl = null
          break
        }
        case 'Q': {
          const c = toAbsolute(command.values[0], command.values[1], relative)
          const p = toAbsolute(command.values[2], command.values[3], relative)
          emitPolyline(sampleQuadraticBezier(current, c, p, Math.max(options.cellWidth, options.cellHeight)))
          current = p
          prevQuadraticControl = c
          prevCubicControl = null
          break
        }
        case 'T': {
          const reflected: Point =
            prevCmd === 'Q' || prevCmd === 'T'
              ? {
                  x: current.x * 2 - (prevQuadraticControl?.x ?? current.x),
                  y: current.y * 2 - (prevQuadraticControl?.y ?? current.y),
                }
              : current
          const p = toAbsolute(command.values[0], command.values[1], relative)
          emitPolyline(sampleQuadraticBezier(current, reflected, p, Math.max(options.cellWidth, options.cellHeight)))
          current = p
          prevQuadraticControl = reflected
          prevCubicControl = null
          break
        }
        case 'A': {
          const end = toAbsolute(command.values[5], command.values[6], relative)
          const samples = sampleArc(current, end, command.values)
          emitPolyline(samples)
          current = end
          prevQuadraticControl = null
          prevCubicControl = null
          break
        }
        case 'Z': {
          emitPolyline([current, subpathStart])
          current = subpathStart
          prevQuadraticControl = null
          prevCubicControl = null
          break
        }
        default:
          break
      }

      prevCmd = upper
    }
  }

  private drawText(
    grid: TextGrid,
    attrs: {
      x?: number
      y?: number
      width?: number
      height?: number
      text?: string
      textAlign?: string
      textBaseline?: string
      lineHeight?: number
    },
    matrix: Matrix,
    options: TextRendererOptions,
  ) {
    const rawText = attrs.text || ''
    if (!rawText) return

    const lines = rawText.split('\n')
    const inferredWidth = Math.max(...lines.map(line => textDisplayWidth(line)), 0) * options.cellWidth
    const inferredHeight = lines.length * options.cellHeight

    const width = Number(attrs.width ?? inferredWidth)
    const height = Number(attrs.height ?? inferredHeight)

    const anchor = transformPoint(
      {
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
      },
      matrix,
    )

    const { left, top } = calcTextTopLeft(anchor.x, anchor.y, width, height, attrs.textAlign, attrs.textBaseline)
    const baseCol = Math.round(left / options.cellWidth)
    const baseRow = Math.round(top / options.cellHeight)
    const lineHeight = Number(attrs.lineHeight || options.cellHeight)

    lines.forEach((line, lineIndex) => {
      const row = baseRow + Math.round((lineIndex * lineHeight) / options.cellHeight)
      let col = baseCol

      for (const char of Array.from(line)) {
        const widthInCells = charWidth(char)
        if (widthInCells <= 0) continue

        grid.setText(col, row, char)
        if (widthInCells > 1) {
          for (let i = 1; i < widthInCells; i++) {
            grid.setTextContinuation(col + i, row)
          }
        }
        col += widthInCells
      }
    })
  }

  private drawLine(grid: TextGrid, p0: Point, p1: Point, options: TextRendererOptions) {
    const c0 = Math.round(p0.x / options.cellWidth)
    const r0 = Math.round(p0.y / options.cellHeight)
    const c1 = Math.round(p1.x / options.cellWidth)
    const r1 = Math.round(p1.y / options.cellHeight)

    if (Math.max(c0, c1) < 0 || Math.max(r0, r1) < 0 || Math.min(c0, c1) >= grid.cols || Math.min(r0, r1) >= grid.rows) {
      return
    }

    let x = c0
    let y = r0

    const dx = Math.abs(c1 - c0)
    const sx = c0 < c1 ? 1 : -1
    const dy = -Math.abs(r1 - r0)
    const sy = r0 < r1 ? 1 : -1
    let err = dx + dy

    while (!(x === c1 && y === r1)) {
      const e2 = 2 * err
      let nx = x
      let ny = y
      if (e2 >= dy) {
        err += dy
        nx += sx
      }
      if (e2 <= dx) {
        err += dx
        ny += sy
      }
      grid.addLineConnection(x, y, nx, ny)
      x = nx
      y = ny
    }
  }
}
