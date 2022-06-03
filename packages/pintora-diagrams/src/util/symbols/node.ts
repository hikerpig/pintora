import { symbolRegistry, safeAssign, ContentArea, clamp } from '@pintora/core'
import { makeMark } from '../artist-util'

const PROJECT_X = 12
const PROJECT_Y = 12

symbolRegistry.register('node', {
  type: 'factory',
  modes: ['container', 'icon'],
  symbolMargin: {
    top: PROJECT_Y,
    right: PROJECT_X,
  },
  factory(contentArea, { mode }) {
    if (mode === 'icon') {
      const height = contentArea.height - PROJECT_Y
      const newArea: ContentArea = {
        x: contentArea.x,
        y: contentArea.y + PROJECT_Y / 2,
        width: clamp(contentArea.width - PROJECT_X, contentArea.width * 0.6, height),
        height,
      }
      return makeNode(newArea)
    }
    return makeNode(contentArea)
  },
  styleMark(mark, def, attrs) {
    mark.children.forEach(child => {
      safeAssign(child.attrs, attrs)
    })
  },
})

function makeNode(contentArea: ContentArea) {
  const { width, height, x, y } = contentArea
  const halfHeight = height / 2
  const halfWidth = width / 2
  const leftX = x - width / 2
  const topY = y - halfHeight
  const projectX = PROJECT_X
  const projectY = PROJECT_Y
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
            ['L', leftX + width, topY],
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
        top: -projectY - halfHeight,
        bottom: halfHeight,
        width: width + projectY,
        height: height + projectY,
      },
    },
  )
  return sym
}
