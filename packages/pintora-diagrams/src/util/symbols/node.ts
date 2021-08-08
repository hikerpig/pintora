import pintora, { safeAssign } from '@pintora/core'
import { makeMark } from '../artist-util'

pintora.symbolRegistry.register('node', {
  type: 'factory',
  factory({ width, height, x, y }) {
    const halfHeight = height / 2
    const halfWidth = width / 2
    const leftX = x - width / 2
    const topY = y - halfHeight
    const projectX = 12
    const projectY = 12
    const mark = makeMark(
      'group',
      {},
      {
        children: [
          makeMark('path', {
            lineJoin: 'round',
            path: [
              ['M', leftX, topY],
              ['L', leftX + projectX, topY - projectY],
              ['L', leftX + projectX + width, topY - projectY],
              ['L', leftX + width, topY],
              ['M', leftX + projectX + width, topY - projectY],
              ['L', leftX + projectX + width, topY - projectY + height],
              ['L', leftX + width, topY + height],
            ],
          }),
          makeMark('rect', {
            x: leftX,
            y: topY,
            width,
            height,
          }),
        ],
      },
    )
    const sym = makeMark(
      'symbol',
      {},
      {
        mark,
        symbolBounds: {
          left: -halfWidth,
          right: halfWidth,
          top: - projectY - halfHeight,
          bottom: halfHeight,
          width: width + projectY,
          height: height + projectY,
        },
      },
    )
    return sym
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})
