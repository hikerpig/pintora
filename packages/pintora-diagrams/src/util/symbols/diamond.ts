import { symbolRegistry, safeAssign, ContentArea } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('diamond', {
  type: 'factory',
  factory(contentArea, { mode }) {
    if (mode === 'container') {
      return makeContainer(contentArea)
    }
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})

function makeContainer({ width, height, x, y }: ContentArea) {
  const padY = 6
  const ry = height + padY
  const rx = (ry * width) / height / 2
  const padX = rx - width / 2

  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('path', {
          path: [['M', x, y], ['m', -rx, 0], ['l', rx, ry], ['l', rx, -ry], ['l', -rx, -ry], ['Z']],
        }),
      ],
    },
  )

  const leftX = x - padX
  const rightX = x + padX
  const outerWidth = rx * 2
  const outerHeight = ry * 2
  const sym = makeMark(
    'symbol',
    {},
    {
      mark,
      symbolBounds: {
        left: leftX,
        right: rightX,
        top: y - ry,
        bottom: y + ry,
        width: outerWidth,
        height: outerHeight,
      },
    },
  )
  return sym
}
