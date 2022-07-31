import { symbolRegistry, safeAssign, ContentArea } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('ellipse', {
  type: 'factory',
  factory(contentArea, { mode }) {
    if (mode === 'container') {
      return makeEllipseContainer(contentArea)
    }
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})

function makeEllipseContainer({ width, height, x, y }: ContentArea) {
  const halfWidth = width / 2
  const padX = 10
  const padY = 8
  const rx = halfWidth + padX
  const ry = height / 2 + padY
  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('ellipse', {
          rx,
          ry,
          x: x,
          y: y,
          cx: x, // FIXME: is x
          cy: y,
        }),
      ],
    },
  )

  const leftX = x - padX
  const rightX = x + padX
  const outerWidth = width + 2 * padX
  const outerHeight = height + 2 * padY
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
