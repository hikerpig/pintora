import { GraphicsIR } from '@pintora/core'

export const sequenceIr: GraphicsIR = {
  width: 240,
  height: 140,
  mark: {
    type: 'group',
    children: [
      {
        type: 'rect',
        attrs: { x: 20, y: 8, width: 64, height: 24, stroke: '#333', fill: null },
      },
      {
        type: 'rect',
        attrs: { x: 152, y: 8, width: 64, height: 24, stroke: '#333', fill: null },
      },
      {
        type: 'text',
        attrs: { x: 52, y: 24, text: '张三', textAlign: 'center', textBaseline: 'middle' },
      },
      {
        type: 'text',
        attrs: { x: 184, y: 24, text: '李四', textAlign: 'center', textBaseline: 'middle' },
      },
      {
        type: 'line',
        attrs: { x1: 52, y1: 40, x2: 52, y2: 128, stroke: '#777' },
      },
      {
        type: 'line',
        attrs: { x1: 184, y1: 40, x2: 184, y2: 128, stroke: '#777' },
      },
      {
        type: 'line',
        attrs: { x1: 52, y1: 72, x2: 184, y2: 72, stroke: '#333' },
      },
    ],
  },
}
