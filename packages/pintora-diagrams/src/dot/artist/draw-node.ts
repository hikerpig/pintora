import { LayoutNode } from '../../util/graph'
import { floorValues } from '../../util/bound'
import { TRANSFORM_GRAPH } from '../../util/mark-positioner'
import { DOTShapeType } from '../db'
import { ContentArea, makeMark, MarkAttrs, symbolRegistry, TSize } from '@pintora/core'

type DrawNodeContext = {
  data: LayoutNode
  shape: string
  markAttrs: MarkAttrs
  textDims: TSize
}

const SHAPE_MAP: Partial<Record<DOTShapeType, string>> = {
  ellipse: 'ellipse',
  circle: 'circle',
}

/**
 * Draw dot node, may be shape or just simple box
 */
export function drawNodeShape(context: DrawNodeContext) {
  const { data, shape, textDims, markAttrs } = context
  const flooredGeom = floorValues(TRANSFORM_GRAPH.graphNodeToRectStart(data))

  if (shape) {
    const mappedShape = SHAPE_MAP[shape]
    const symbolDef = symbolRegistry.get(mappedShape || shape)
    if (symbolDef) {
      const contentArea: ContentArea = {
        x: data.x,
        y: data.y,
        width: textDims.width,
        height: textDims.height,
      }
      const sym = symbolRegistry.create(shape, {
        mode: 'container',
        attrs: markAttrs,
        contentArea,
      })
      // console.log('draw shape', shape, sym)
      return {
        containerNode: sym,
      }
    }
  }

  const nodeRect = makeMark('rect', {
    ...flooredGeom,
    ...markAttrs,
  })
  if (shape === 'plaintext') {
    nodeRect.attrs.fill = 'transparent'
    nodeRect.attrs.stroke = 'transparent'
  }

  return {
    containerNode: nodeRect,
  }
}
