import pintora, { safeAssign } from '@pintora/core'
import { makeMark } from '../artist-util'

pintora.symbolRegistry.register('cloud', {
  type: 'factory',
  // symbolMargin: {
  //   left: 20,
  //   right: 20,
  // },
  factory({ width, height, x, y }) {
    const halfWidth = width / 2
    const ry = height / 2
    const rx = halfWidth + ry / Math.sqrt(3)
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
              ['l', rx - halfWidth, -ry],
              ['l', width, 0],
              ['l', rx - halfWidth, ry],
              ['l', halfWidth - rx, ry],
              ['l', -width, 0],
              ['Z'],
            ],
          }),
        ],
      },
    )

    const outerWidth = rx
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
