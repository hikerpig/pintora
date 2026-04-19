import { GraphicsIR } from '@pintora/core/lib/type'
import { IRenderer } from '../type'
import { BaseRenderer } from './base'
import { SvgRenderer } from './SvgRenderer'
import { CanvasRenderer } from './CanvasRenderer'
import { AsciiRenderer } from './AsciiRenderer'

export { BaseRenderer }

export type RendererType = 'svg' | 'canvas' | 'ascii'

type RendererConstructor = {
  new (ir: GraphicsIR): IRenderer
}

class RendererRegistry {
  renderers: Record<RendererType, RendererConstructor | null> = {
    svg: SvgRenderer,
    canvas: CanvasRenderer,
    ascii: AsciiRenderer,
  }

  getRendererClass(name: RendererType) {
    return this.renderers[name]
  }

  register(name: RendererType, cls: RendererConstructor) {
    this.renderers[name] = cls
  }
}

export const rendererRegistry = new RendererRegistry()

export function makeRenderer(ir: GraphicsIR, type?: RendererType | void): IRenderer {
  type = type || 'svg'
  const rendererCtor = rendererRegistry.getRendererClass(type)
  if (!rendererCtor) {
    return new SvgRenderer(ir)
  }
  return new rendererCtor(ir)
}
