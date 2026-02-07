import { symbolRegistry, safeAssign, ContentArea } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('circle', {
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
  const halfWidth = width / 2
  const pad = 10
  const r = halfWidth + pad
  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('circle', {
          r,
          cx: x,
          cy: y,
        }),
      ],
    },
  )

  const leftX = x - pad
  const rightX = x + pad
  const outerWidth = width + 2 * pad
  const outerHeight = height + 2 * pad
  const sym = makeMark(
    'symbol',
    {},
    {
      mark,
      symbolBounds: {
        left: leftX,
        right: rightX,
        top: y - r,
        bottom: y + r,
        width: outerWidth,
        height: outerHeight,
      },
    },
  )
  return sym
}
