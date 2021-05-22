import { GraphicsIR } from '@pintora/core/lib/type'
import { BaseRenderer } from './base'
import { SvgRenderer } from './SvgRenderer'
import { CanvasRenderer } from './CanvasRenderer'

export type RendererType = 'svg' | 'canvas'

export function makeRenderer(ir: GraphicsIR, type?: RendererType | void): BaseRenderer {
  type = type || 'svg'
  if (type === 'canvas') {
    return new CanvasRenderer(ir)
  }
  return new SvgRenderer(ir)
}