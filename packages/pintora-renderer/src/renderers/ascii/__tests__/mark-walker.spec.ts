import { Group } from '@pintora/core'
import { collectDrawOps } from '../mark-walker'
import { IDENTITY_MATRIX } from '../types'

describe('mark walker', () => {
  it('collects normalized draw ops from nested/grouped marks', () => {
    const mark: Group = {
      type: 'group',
      children: [
        {
          type: 'rect',
          attrs: { x: 0, y: 0, width: 20, height: 10 },
        },
        {
          type: 'line',
          attrs: { x1: 0, y1: 12, x2: 20, y2: 12 },
        },
        {
          type: 'polyline',
          attrs: {
            points: [
              [0, 14],
              [8, 18],
              [20, 14],
            ],
          },
        },
        {
          type: 'path',
          attrs: { path: 'M0 20 L20 20 L20 24 Z' },
        },
        {
          type: 'text',
          attrs: { x: 4, y: 6, text: 'hello', textAlign: 'left', textBaseline: 'top' },
        },
        {
          type: 'symbol',
          anchorPoint: { x: 0, y: 0 },
          symbolBounds: { left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 },
          mark: {
            type: 'group',
            children: [
              {
                type: 'line',
                attrs: { x1: 2, y1: 2, x2: 8, y2: 8 },
              },
            ],
          },
        },
      ],
    }

    const ops = collectDrawOps(mark, IDENTITY_MATRIX)

    expect(ops.some(op => op.kind === 'segment')).toBe(true)
    expect(ops.some(op => op.kind === 'text')).toBe(true)
  })

  it('collects semantic connector marks as connector ops', () => {
    const mark: Group = {
      type: 'group',
      children: [
        {
          type: 'line',
          attrs: { x1: 0, y1: 16, x2: 64, y2: 16 },
          semantic: {
            role: 'connector',
            strokePolicy: 'always',
            connector: {
              family: 'sequence-message',
              compact: true,
              shaftStyle: 'solid',
              startTerminator: { kind: 'none' },
              endTerminator: { kind: 'arrow-filled' },
            },
          } as any,
        } as any,
      ],
    }

    const ops = collectDrawOps(mark, IDENTITY_MATRIX)
    const connectorOp = ops.find((op: any) => op.kind === 'connector') as any

    expect(connectorOp).toBeTruthy()
    expect(connectorOp.semantic.connector.endTerminator.kind).toBe('arrow-filled')
    expect(connectorOp.points).toEqual([
      { x: 0, y: 16 },
      { x: 64, y: 16 },
    ])
  })

  it('collects semantic symbol marks as symbol ops with fallback geometry', () => {
    const mark: Group = {
      type: 'group',
      children: [
        {
          type: 'circle',
          attrs: { cx: 24, cy: 16, r: 8 },
          semantic: {
            role: 'symbol',
            strokePolicy: 'always',
            symbol: {
              family: 'component-node',
              kind: 'component-interface',
              compact: true,
            },
          } as any,
        } as any,
      ],
    }

    const ops = collectDrawOps(mark, IDENTITY_MATRIX)
    const symbolOp = ops.find((op: any) => op.kind === 'symbol') as any

    expect(symbolOp).toBeTruthy()
    expect(symbolOp.point).toEqual({ x: 24, y: 16 })
    expect(symbolOp.semantic.symbol.kind).toBe('component-interface')
    expect(symbolOp.fallbackOps.length).toBeGreaterThan(0)
  })
})
