import { GraphicsIR } from '@pintora/core'
import { IRenderer } from './type'
import { makeRenderer, RendererType } from './renderers'

export type RenderOptions = {
  container: any
  renderer?: RendererType
  onRender?(renderer: IRenderer): void
}

export function render(ir: GraphicsIR, opts: RenderOptions) {
  console.log('TBD, render', ir)
  const renderer = makeRenderer(ir, opts.renderer).setContainer(opts.container)

  renderer.render()

  if (opts.onRender) {
    opts.onRender(renderer)
  }
}
