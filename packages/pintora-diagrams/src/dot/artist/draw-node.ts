import { LayoutNode } from '../../util/graph'
import { floorValues } from '../../util/bound'
import { TRANSFORM_GRAPH } from '../../util/mark-positioner'
import { DOTShapeType, NodeAttrs } from '../db'
import { ContentArea, makeMark, MarkAttrs, symbolRegistry, TSize } from '@pintora/core'

type DrawNodeContext = {
  data: LayoutNode
  nodeAttrs: NodeAttrs
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
  const { data, nodeAttrs: attrs, textDims, markAttrs } = context
  const flooredGeom = floorValues(TRANSFORM_GRAPH.graphNodeToRectStart(data))

  if (attrs.shape) {
    const mappedShape = SHAPE_MAP[attrs.shape]
    const symbolDef = symbolRegistry.get(mappedShape || attrs.shape)
    if (symbolDef) {
      const contentArea: ContentArea = {
        x: data.x,
        y: data.y,
        width: textDims.width,
        height: textDims.height,
      }
      const sym = symbolRegistry.create(attrs.shape, {
        mode: 'container',
        attrs: markAttrs,
        contentArea,
      })
      return {
        containerNode: sym,
      }
    }
  }

  const nodeRect = makeMark('rect', {
    ...flooredGeom,
    ...markAttrs,
  })
  if (attrs.shape === 'plaintext') {
    nodeRect.attrs.fill = 'transparent'
    nodeRect.attrs.stroke = 'transparent'
  }

  return {
    containerNode: nodeRect,
  }
}
