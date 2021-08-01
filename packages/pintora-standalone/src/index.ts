import pintora, { GraphicsIR, IDiagram } from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
import { render, RenderOptions, BaseRenderer, rendererRegistry } from '@pintora/renderer'

function initDiagrams() {
  Object.keys(DIAGRAMS).forEach(name => {
    pintora.registerDiagram(name, DIAGRAMS[name])
  })
}
initDiagrams()

type InitBrowserOptions = {
  startOnLoad?: boolean
}

type DiagramsType = typeof DIAGRAMS
type InspectConfType<T> = T extends IDiagram<infer D, infer C> ? C: any;

type DiagramConf = {
  component: InspectConfType<DiagramsType['componentDiagram']>
  er: InspectConfType<DiagramsType['erDiagram']>
  sequence: InspectConfType<DiagramsType['sequenceDiagram']>
}

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
  /**
   * Init in browser
   */
  initBrowser(options: InitBrowserOptions = {}) {
    // if (options.startOnLoad) {
    // }

    const selector = '.pintora'
    const containers = document.querySelectorAll(selector)
    containers.forEach((container: HTMLDivElement) => {
      pintoraStandalone.renderContentOf(container)
    })
  },
  renderContentOf(container: HTMLDivElement) {
    const wrapper = document.createElement('div')
    wrapper.classList.add('pintora-wrapper')
    container.style.display = 'none'

    container.parentNode.insertBefore(wrapper, container)
    pintoraStandalone.renderTo(container.innerText, {
      container: wrapper,
    })
  },

  setConfig(conf: DiagramConf) {
    for (const [key, c] of Object.entries(conf)) {
      const diagram = pintora.getDiagram(key)
      if (diagram) {
        diagram.setConfig(c)
      }
    }
  },
}

export { BaseRenderer, rendererRegistry }

export { pintoraStandalone }

export default pintoraStandalone
