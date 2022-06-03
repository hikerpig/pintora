import { symbolRegistry, safeAssign, ContentArea } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('cloud', {
  type: 'factory',
  // only valid in container mode
  symbolMargin: {
    top: 20,
  },
  factory(contentArea, { mode }) {
    if (mode === 'container') {
      return makeCloudContainer(contentArea)
    }
    return makeCloudIcon(contentArea)
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})

function makeCloudIcon({ width, height, x, y }: ContentArea) {
  const leftX = x - width / 2
  const topY = y - height / 2
  const CLOUD_ICON_HEIGHT = 24
  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('path', {
          lineJoin: 'round',
          lineWidth: 3,
          path: [
            `M ${leftX} ${topY - CLOUD_ICON_HEIGHT}`,
            'm 23.2 12.1 c -0.8 -4.1 -4.4 -7.3 -8.8 -7.3 c -3.5 0 -6.5 2 -8 4.9 c -3.6 0.4 -6.4 3.4 -6.4 7.1 c 0 4 3.2 7.2 7.2 7.2 h 15.6 c 3.3 0 6 -2.7 6 -6 c 0 -3.2 -2.5 -5.8 -5.6 -5.9 z',
          ].join(' '),
        }),
      ],
    },
  )
  return makeMark(
    'symbol',
    {},
    {
      mark,
    },
  )
}

function makeCloudContainer({ width, height, x, y }: ContentArea) {
  const halfWidth = width / 2
  const ry = height / 2
  const rx = halfWidth + ry / Math.sqrt(3)
  const leftX = x - width / 2
  const topY = y - height / 2
  const CLOUD_ICON_HEIGHT = 24
  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('path', {
          lineJoin: 'round',
          lineWidth: 3,
          path: [
            `M ${leftX} ${topY - CLOUD_ICON_HEIGHT + 4}`,
            'm 23.2 12.1 c -0.8 -4.1 -4.4 -7.3 -8.8 -7.3 c -3.5 0 -6.5 2 -8 4.9 c -3.6 0.4 -6.4 3.4 -6.4 7.1 c 0 4 3.2 7.2 7.2 7.2 h 15.6 c 3.3 0 6 -2.7 6 -6 c 0 -3.2 -2.5 -5.8 -5.6 -5.9 z',
          ].join(' '),
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
}
