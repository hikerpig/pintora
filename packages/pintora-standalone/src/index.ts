import pintora, { GraphicsIR } from '@pintora/core'
import { sequenceDiagram } from '@pintora/diagrams'
import { render, RenderOptions, BaseRenderer, rendererRegistry } from '@pintora/renderer'

function initDiagrams() {
  pintora.registerDiagram('sequenceDiagram', sequenceDiagram)
}

initDiagrams()

interface RenderToOptions extends RenderOptions {
  onError?(message: string): void
  enhanceGraphicIR?(ir: GraphicsIR): GraphicsIR
}

const pintoraStandalone = {
  ...pintora,
  renderTo(code: string, options: RenderToOptions) {
    const { container } = options
    let ctn: HTMLDivElement
    if (typeof container === 'string') {
      ctn = document.querySelector(container) as any
    } else {
      ctn = container
    }

    const drawResult = pintoraStandalone.parseAndDraw(code, options)

    let graphicIR = drawResult.graphicIR
    if (options.enhanceGraphicIR) graphicIR = options.enhanceGraphicIR(graphicIR)

    render(graphicIR, options)
  },
}

export {
  BaseRenderer,
  rendererRegistry
}

export { pintoraStandalone }

export default pintoraStandalone
