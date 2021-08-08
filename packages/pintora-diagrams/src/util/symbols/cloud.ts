import pintora, { safeAssign } from '@pintora/core'
import { makeMark } from '../artist-util'

pintora.symbolRegistry.register('cloud', {
  type: 'factory',
  factory({ width, height, x, y }) {
    const rx = width * 5 / 6
    const ry = height / 2
    // hexagon
    const mark = makeMark(
      'group',
      {},
      {
        children: [
          makeMark('path', {
            lineJoin: 'round',
            path: [
              ['M', x - rx, y],
              ['l', rx / 3, -ry],
              ['l', rx * 4 / 3, 0],
              ['l', rx / 3, ry],
              ['l', -rx / 3, ry],
              ['l', -rx * 4 / 3, 0],
              ['Z'],
            ],
          }),
        ],
      },
    )

    const outerWidth = rx * 2
    const outerHeight = height
    const sym = makeMark(
      'symbol',
      {},
      {
        mark,
        symbolBounds: {
          left: -outerWidth / 2,
          right: outerWidth / 2,
          top: -outerHeight / 2,
          bottom: outerHeight / 2,
          width: outerWidth,
          height: outerHeight,
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
