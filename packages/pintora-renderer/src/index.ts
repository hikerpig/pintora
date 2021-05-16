import pintora, { IDiagram, GraphicsIR } from "@pintora/core"
import { Canvas } from '@antv/g-svg'

class SvgRenderer {
  container: HTMLElement | null = null
  protected gcvs?: Canvas
  constructor(protected ir: GraphicsIR) {
  }

  setContainer(c: HTMLElement) {
    this.container = c
    const gcvs = new Canvas({
      container: c,
    })
    this.gcvs = gcvs
  }
  render() {
  }
}

export function render(ir: GraphicsIR, opts: { container: any }) {
  console.log('TBD, render', ir)
  const renderer = new SvgRenderer(ir)
  renderer.setContainer(opts.container)

  renderer.render()
}