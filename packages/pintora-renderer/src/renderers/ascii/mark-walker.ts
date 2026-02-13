import { Mark } from '@pintora/core'
import { flattenPath } from './path-flattener'
import { DrawOp, SegmentOp, TextOp } from './ops'
import { IDENTITY_MATRIX, Matrix, Point } from './types'

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

function transformPoint(point: Point, matrix: Matrix): Point {
  return {
    x: matrix[0] * point.x + matrix[3] * point.y + matrix[6],
    y: matrix[1] * point.x + matrix[4] * point.y + matrix[7],
  }
}

function addSegment(ops: DrawOp[], p0: Point, p1: Point, layer: 1 | 2 = 2): void {
  const op: SegmentOp = { kind: 'segment', p0, p1, layer }
  ops.push(op)
}

function addPolyline(ops: DrawOp[], points: Point[], close = false, layer: 1 | 2 = 2): void {
  if (points.length < 2) return
  for (let i = 1; i < points.length; i++) {
    addSegment(ops, points[i - 1], points[i], layer)
  }
  if (close && points.length > 2) {
    addSegment(ops, points[points.length - 1], points[0], layer)
  }
}

function sampleCircle(cx: number, cy: number, r: number, matrix: Matrix): Point[] {
  const points: Point[] = []
  const segments = 32
  for (let i = 0; i <= segments; i++) {
    const rad = (Math.PI * 2 * i) / segments
    points.push(
      transformPoint(
        {
          x: cx + Math.cos(rad) * r,
          y: cy + Math.sin(rad) * r,
        },
        matrix,
      ),
    )
  }
  return points
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, matrix: Matrix): Point[] {
  const points: Point[] = []
  const segments = 40
  for (let i = 0; i <= segments; i++) {
    const rad = (Math.PI * 2 * i) / segments
    points.push(
      transformPoint(
        {
          x: cx + Math.cos(rad) * rx,
          y: cy + Math.sin(rad) * ry,
        },
        matrix,
      ),
    )
  }
  return points
}

function collect(mark: Mark, parentMatrix: Matrix, ops: DrawOp[]): void {
  const matrix = multiplyMat3(parentMatrix, toMatrix(mark.matrix))

  if (mark.type === 'group') {
    for (const child of mark.children) {
      collect(child, matrix, ops)
    }
    return
  }

  if (mark.type === 'symbol') {
    collect(mark.mark, matrix, ops)
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
    addPolyline(ops, [p1, p2, p3, p4], true, 2)
    return
  }

  if (mark.type === 'line') {
    const attrs = mark.attrs
    addSegment(
      ops,
      transformPoint({ x: attrs.x1, y: attrs.y1 }, matrix),
      transformPoint({ x: attrs.x2, y: attrs.y2 }, matrix),
      2,
    )
    return
  }

  if (mark.type === 'polyline' || mark.type === 'polygon') {
    const points = (mark.attrs.points || []).map(point => transformPoint({ x: point[0], y: point[1] }, matrix))
    addPolyline(ops, points, mark.type === 'polygon', 2)
    return
  }

  if (mark.type === 'circle') {
    const attrs = mark.attrs
    const cx = Number(attrs.cx ?? attrs.x ?? 0)
    const cy = Number(attrs.cy ?? attrs.y ?? 0)
    const r = Number(attrs.r || 0)
    addPolyline(ops, sampleCircle(cx, cy, r, matrix), false, 2)
    return
  }

  if (mark.type === 'ellipse') {
    const attrs = mark.attrs
    const cx = Number(attrs.cx ?? 0)
    const cy = Number(attrs.cy ?? 0)
    const rx = Number(attrs.rx ?? 0)
    const ry = Number(attrs.ry ?? 0)
    addPolyline(ops, sampleEllipse(cx, cy, rx, ry, matrix), false, 2)
    return
  }

  if (mark.type === 'path') {
    const maxStep = 4
    const sampled = flattenPath(mark.attrs.path, maxStep).map(point => transformPoint(point, matrix))
    addPolyline(ops, sampled, false, 2)
    return
  }

  if (mark.type === 'text') {
    const attrs = mark.attrs
    const text = attrs.text || ''
    if (!text) return
    const point = transformPoint(
      {
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
      },
      matrix,
    )
    const op: TextOp = {
      kind: 'text',
      point,
      text,
      width: attrs.width,
      height: attrs.height,
      textAlign: attrs.textAlign,
      textBaseline: attrs.textBaseline,
      lineHeight: attrs.lineHeight,
      layer: 3,
    }
    ops.push(op)
  }
}

export function collectDrawOps(mark: Mark, parentMatrix: Matrix = IDENTITY_MATRIX): DrawOp[] {
  const ops: DrawOp[] = []
  collect(mark, parentMatrix, ops)
  return ops
}
