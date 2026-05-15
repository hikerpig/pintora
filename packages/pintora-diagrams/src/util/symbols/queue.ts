import { ContentArea, safeAssign, symbolRegistry } from '@pintora/core'
import { makeMark } from '../artist-util'

symbolRegistry.register('queue', {
  type: 'factory',
  modes: ['icon'],
  factory(contentArea) {
    return makeQueueIcon(contentArea)
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})

function makeQueueIcon({ width, height, x, y }: ContentArea) {
  const left = x - width / 2
  const top = y - height / 2
  return makeMark(
    'symbol',
    {},
    {
      mark: makeMark(
        'group',
        {},
        {
          children: [
            makeMark('rect', {
              x: left,
              y: top,
              width,
              height,
              radius: 4,
            }),
            makeMark('path', {
              path: [
                ['M', left + 4, top + 8],
                ['L', left + width - 4, top + 8],
                ['M', left + 4, top + 14],
                ['L', left + width - 4, top + 14],
                ['M', left + 4, top + 20],
                ['L', left + width - 4, top + 20],
              ],
            }),
          ],
        },
      ),
    },
  )
}
