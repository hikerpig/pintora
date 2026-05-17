import {
  drawRoute,
  lineOp,
  manhattanize,
  measureTextDiagramOps,
  rectOp,
  snapRouteEndpoints,
  textOp,
} from '../text-diagram'

describe('text-diagram helpers', () => {
  it('draws axis-aligned route segments with edge heads only on the route ends', () => {
    const ops = drawRoute(
      [
        { x: 1, y: 1 },
        { x: 4, y: 1 },
        { x: 4, y: 3 },
      ],
      { stroke: 'dashed', startHead: 'open', endHead: 'filled' },
    )

    expect(ops).toEqual([
      lineOp({ x: 1, y: 1 }, { x: 4, y: 1 }, { stroke: 'dashed', startHead: 'open' }),
      lineOp({ x: 4, y: 1 }, { x: 4, y: 3 }, { stroke: 'dashed', endHead: 'filled' }),
    ])
  })

  it('manhattanizes diagonal point lists and snaps endpoints outside boxes', () => {
    const route = manhattanize([
      { x: 2, y: 2 },
      { x: 8, y: 5 },
    ])
    const snapped = snapRouteEndpoints(
      route,
      { left: 0, top: 0, right: 4, bottom: 4 },
      { left: 7, top: 3, right: 10, bottom: 8 },
    )

    expect(snapped).toEqual([
      { x: 2, y: 5 },
      { x: 6, y: 5 },
    ])
  })

  it('measures text diagram ops with aligned text extents', () => {
    const size = measureTextDiagramOps([
      rectOp(0, 0, 4, 3),
      textOp(8, 1, 'abcd', 'center'),
      textOp(2, 5, '世界', 'right'),
    ])

    expect(size).toEqual({ width: 10, height: 6 })
  })
})
