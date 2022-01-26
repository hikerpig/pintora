import { GraphicsIR } from '@pintora/core/lib/type'
import { BaseRenderer } from './base'
import { SvgRenderer } from './SvgRenderer'
import { CanvasRenderer } from './CanvasRenderer'
import { ExcalidrawRenderer } from './excalidraw'

export { BaseRenderer }

export type RendererType = 'svg' | 'canvas' | 'excalidraw'

type RendererConstructor = {
  new (ir: GraphicsIR): BaseRenderer
}

class RendererRegistry {
  renderers: Record<RendererType, RendererConstructor | null> = {
    svg: SvgRenderer,
    canvas: CanvasRenderer,
    excalidraw: ExcalidrawRenderer,
  }

  getRendererClass(name: RendererType) {
    return this.renderers[name]
  }

  register(name: RendererType, cls: RendererConstructor) {
    this.renderers[name] = cls
  }
}

export const rendererRegistry = new RendererRegistry()

export function makeRenderer(ir: GraphicsIR, type?: RendererType | void): BaseRenderer {
  type = type || 'svg'
  const rendererCtor = rendererRegistry.getRendererClass(type)
  if (!rendererCtor) {
    return new SvgRenderer(ir)
  }
  return new rendererCtor(ir)
}
