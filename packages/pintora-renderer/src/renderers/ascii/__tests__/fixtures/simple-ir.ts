import { GraphicsIR } from '@pintora/core'

export const simpleIr: GraphicsIR = {
  width: 120,
  height: 80,
  mark: {
    type: 'group',
    children: [
      {
        type: 'rect',
        attrs: { x: 8, y: 8, width: 60, height: 24, stroke: '#333', fill: null },
      },
      {
        type: 'line',
        attrs: { x1: 8, y1: 48, x2: 92, y2: 48, stroke: '#333' },
      },
      {
        type: 'text',
        attrs: { x: 16, y: 24, text: 'A' },
      },
    ],
  },
}
