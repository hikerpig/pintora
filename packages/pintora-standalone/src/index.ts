import pintora, { configApi, GraphicsIR } from '@pintora/core'
import { DIAGRAMS, DiagramsConf, THEMES } from '@pintora/diagrams'
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
      if (!graphicIR.bgColor) {
        const conf = configApi.getConfig<DiagramsConf>()
        const canvasBackground = conf.core.themeVariables?.canvasBackground
        if (canvasBackground) graphicIR.bgColor = canvasBackground
      }

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
  setConfig(c: Partial<DiagramsConf>) {
    configApi.setConfig(c)
    if (c.core?.theme) {
      const conf = configApi.getConfig<DiagramsConf>()
      const newConf = { ...conf, }
      const themeConfig = THEMES[c.core.theme]
      if (themeConfig) {
        newConf.core = newConf.core || {} as any
        newConf.core.themeVariables = themeConfig
      }
      configApi.setConfig(newConf)
    }
  },
}

export { BaseRenderer, rendererRegistry, DiagramsConf }

export { pintoraStandalone }

export default pintoraStandalone
