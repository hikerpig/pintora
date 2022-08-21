import { PathCommand, Point } from '@pintora/core'
import { line as d3Line, curveBasis, CurveFactory } from 'd3-shape'

export function getPointsCurvePath(points: Point[], factory: CurveFactory = curveBasis) {
  const pathString = d3Line().curve(factory)(points.map(o => [o.x, o.y]))
  return pathString
}

export function getPointsLinearPath(points: Point[]): PathCommand[] {
  const [startPoint, ...restPoints] = points
  return [
    ['M', startPoint.x, startPoint.y],
    ...restPoints.map(point => {
      return ['L', point.x, point.y] as any
    }),
  ]
}

export function getMedianPoint(points: Point[]) {
  const len = points.length
  const index = Math.floor(len / 2)
  return { index, point: points[index] }
}
