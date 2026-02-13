import { PathCommand } from '@pintora/core'
import { parsePath } from './path-parser'

export type Point = {
  x: number
  y: number
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function estimatePolylineLength(points: Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i])
  }
  return len
}

function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, maxStep: number): Point[] {
  const estimated = estimatePolylineLength([p0, p1, p2, p3])
  const steps = Math.max(4, Math.ceil(estimated / Math.max(maxStep, 1)))
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const inv = 1 - t
    points.push({
      x: inv * inv * inv * p0.x + 3 * inv * inv * t * p1.x + 3 * inv * t * t * p2.x + t * t * t * p3.x,
      y: inv * inv * inv * p0.y + 3 * inv * inv * t * p1.y + 3 * inv * t * t * p2.y + t * t * t * p3.y,
    })
  }
  return points
}

function sampleQuadraticBezier(p0: Point, p1: Point, p2: Point, maxStep: number): Point[] {
  const estimated = estimatePolylineLength([p0, p1, p2])
  const steps = Math.max(4, Math.ceil(estimated / Math.max(maxStep, 1)))
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const inv = 1 - t
    points.push({
      x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
      y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
    })
  }
  return points
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function calcVectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dot = ux * vx + uy * vy
  const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
  if (len === 0) return 0
  let angle = Math.acos(clamp(dot / len, -1, 1))
  if (ux * vy - uy * vx < 0) angle = -angle
  return angle
}

function sampleArc(start: Point, end: Point, args: number[]): Point[] {
  let [rx, ry, xAxisRotation, largeArcFlag, sweepFlag] = args
  rx = Math.abs(rx)
  ry = Math.abs(ry)

  if (rx === 0 || ry === 0) return [start, end]

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
    points.push({
      x: cosPhi * rx * Math.cos(theta) - sinPhi * ry * Math.sin(theta) + cx,
      y: sinPhi * rx * Math.cos(theta) + cosPhi * ry * Math.sin(theta) + cy,
    })
  }
  points[points.length - 1] = { ...end }
  return points
}

function appendSampled(points: Point[], sampled: Point[]): void {
  if (sampled.length === 0) return
  if (points.length === 0) {
    points.push(...sampled)
    return
  }
  points.push(...sampled.slice(1))
}

function toAbsPoint(current: Point, x: number, y: number, relative: boolean): Point {
  return relative ? { x: current.x + x, y: current.y + y } : { x, y }
}

export function flattenPath(input: string | PathCommand[], maxStep = 4): Point[] {
  const commands = parsePath(input)
  const output: Point[] = []
  let current: Point = { x: 0, y: 0 }
  let subpathStart: Point = { x: 0, y: 0 }

  for (const command of commands) {
    const upper = command.cmd.toUpperCase()
    const relative = command.cmd !== upper
    const values = command.values

    if (upper === 'M') {
      current = toAbsPoint(current, values[0] || 0, values[1] || 0, relative)
      subpathStart = { ...current }
      output.push({ ...current })
      continue
    }

    if (upper === 'L') {
      current = toAbsPoint(current, values[0] || 0, values[1] || 0, relative)
      output.push({ ...current })
      continue
    }

    if (upper === 'H') {
      current = relative ? { x: current.x + (values[0] || 0), y: current.y } : { x: values[0] || 0, y: current.y }
      output.push({ ...current })
      continue
    }

    if (upper === 'V') {
      current = relative ? { x: current.x, y: current.y + (values[0] || 0) } : { x: current.x, y: values[0] || 0 }
      output.push({ ...current })
      continue
    }

    if (upper === 'C') {
      const p0 = current
      const p1 = toAbsPoint(current, values[0] || 0, values[1] || 0, relative)
      const p2 = toAbsPoint(current, values[2] || 0, values[3] || 0, relative)
      const p3 = toAbsPoint(current, values[4] || 0, values[5] || 0, relative)
      appendSampled(output, sampleCubicBezier(p0, p1, p2, p3, maxStep))
      current = p3
      continue
    }

    if (upper === 'Q') {
      const p0 = current
      const p1 = toAbsPoint(current, values[0] || 0, values[1] || 0, relative)
      const p2 = toAbsPoint(current, values[2] || 0, values[3] || 0, relative)
      appendSampled(output, sampleQuadraticBezier(p0, p1, p2, maxStep))
      current = p2
      continue
    }

    if (upper === 'A') {
      const end = toAbsPoint(current, values[5] || 0, values[6] || 0, relative)
      appendSampled(output, sampleArc(current, end, values))
      current = end
      continue
    }

    if (upper === 'Z') {
      if (output.length === 0) continue
      if (current.x !== subpathStart.x || current.y !== subpathStart.y) {
        output.push({ ...subpathStart })
      }
      current = { ...subpathStart }
    }
  }

  return output
}
