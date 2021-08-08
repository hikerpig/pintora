import { safeAssign, symbolRegistry } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('package', {
  type: 'factory',
  factory({ width, height, x, y }) {
    const halfHeight = height / 2
    const halfWidth = width / 2
    const leftX = x - width / 2
    const topY = y - halfHeight
    const labelHeight = 12
    const mark = makeMark(
      'group',
      {},
      {
        children: [
          makeMark('path', {
            path: [
              ['M', leftX, topY], // left bottom of label
              ['L', leftX, topY - labelHeight], // left top of label
              ['L', leftX + width / 2, topY - labelHeight], // right top of label
              ['L', leftX + width / 2 + 4, topY], // right bottom of label
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
          top: -labelHeight - halfHeight,
          bottom: halfHeight,
          width,
          height: height + labelHeight,
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

symbolRegistry.register('folder', symbolRegistry.get('package'))
