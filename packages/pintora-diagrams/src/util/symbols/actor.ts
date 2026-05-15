import { symbolRegistry, safeAssign, ContentArea } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('actor', {
  type: 'factory',
  modes: ['icon'],
  factory(contentArea) {
    // has only icon mode
    return makeIcon(contentArea)
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
      if (child.type === 'path') {
        child.attrs.fill = null
      }
      child.attrs.lineWidth = Math.max(attrs.lineWidth || 0, 1.5)
    })
  },
})

function makeIcon({ width, height, x, y }: ContentArea) {
  const radius = Math.min(width, height) / 5
  const topY = y - height / 2
  const bottomY = y + height / 2
  const leftX = x - radius * 1.5
  const rightX = x + radius * 1.5
  const headCenterY = topY + radius
  const neckY = headCenterY + radius
  const shoulderY = neckY + radius * 1.5
  const legHeight = radius * 2
  const hipY = bottomY - legHeight
  const mark = makeMark(
    'group',
    {},
    {
      children: [
        makeMark('circle', {
          r: radius,
          x,
          y: headCenterY,
          width,
          height,
        }),
        makeMark('path', {
          path: [
            ['M', x, neckY],
            ['L', x, hipY],
            ['M', leftX, shoulderY],
            ['L', rightX, shoulderY],
            ['M', x, hipY],
            ['l', -radius, legHeight],
            ['M', x, hipY],
            ['l', radius, legHeight],
          ],
        }),
      ],
    },
  )
  const sym = makeMark(
    'symbol',
    {},
    {
      mark,
    },
  )
  return sym
}
