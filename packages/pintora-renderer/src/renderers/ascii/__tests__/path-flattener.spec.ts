import { flattenPath } from '../path-flattener'

describe('path flattener', () => {
  it('flattens polygon path with close command', () => {
    const points = flattenPath('M0 0 L10 0 L10 10 Z')
    expect(points.length).toBeGreaterThan(3)
    expect(points[0]).toEqual({ x: 0, y: 0 })
  })

  it('samples cubic bezier and ends at the target point', () => {
    const points = flattenPath('M0 0 C10 0 10 10 20 10')
    expect(points.at(-1)).toEqual({ x: 20, y: 10 })
  })

  it('samples arc command', () => {
    const points = flattenPath('M0 0 A10 10 0 0 1 20 0')
    expect(points.length).toBeGreaterThan(4)
    expect(points.at(-1)).toEqual({ x: 20, y: 0 })
  })

  it('supports relative commands', () => {
    const points = flattenPath('M5 5 l10 0 v10 h-5 z')
    expect(points.at(-1)).toEqual({ x: 5, y: 5 })
  })
})
