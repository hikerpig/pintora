import pintora, { GraphicsIR } from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
import { render, RenderOptions, BaseRenderer, rendererRegistry } from '@pintora/renderer'

function initDiagrams() {
  Object.keys(DIAGRAMS).forEach((name) => {
    pintora.registerDiagram(name, DIAGRAMS[name])
  })
}

initDiagrams()

interface RenderToOptions extends RenderOptions {
  onError?(error: Error): void
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

    let drawResult: ReturnType<typeof pintoraStandalone.parseAndDraw>
    try {
      drawResult = pintoraStandalone.parseAndDraw(code, options)
    } catch (error) {
      const onError = options.onError || console.warn
      onError(error)
    }

    if (drawResult) {
      let graphicIR = drawResult.graphicIR
      if (options.enhanceGraphicIR) graphicIR = options.enhanceGraphicIR(graphicIR)

      render(graphicIR, options)
    }
  },
}

export {
  BaseRenderer,
  rendererRegistry
}

export { pintoraStandalone }

export default pintoraStandalone
