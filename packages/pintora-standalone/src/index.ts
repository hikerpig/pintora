import pintora, { configApi, GraphicsIR, PintoraConfig, tinycolor } from '@pintora/core'
export * from '@pintora/core'
import { DIAGRAMS, BaseDiagramIR } from '@pintora/diagrams'
import { render, RenderOptions, BaseRenderer, rendererRegistry } from '@pintora/renderer'

function initDiagrams() {
  Object.keys(DIAGRAMS).forEach(name => {
    pintora.diagramRegistry.registerDiagram(name, DIAGRAMS[name])
  })
}
initDiagrams()

type InitBrowserOptions = {
  startOnLoad?: boolean
}
interface RenderToOptions extends RenderOptions {
  onError?(error: Error): void
  enhanceGraphicIR?(ir: GraphicsIR): GraphicsIR
  config?: PintoraConfig
}

const CLASSES = {
  wrapper: 'pintora-wrapper',
}

class ConfigStack<T> {
  private list: T[] = []
  push(c: T) {
    this.list.push(c)
  }
  pop() {
    return this.list.pop()
  }

  get size() {
    return this.list.length
  }
}

const configStack = new ConfigStack<PintoraConfig>()

const pintoraStandalone = {
  ...pintora,
  renderTo(code: string, options: RenderToOptions) {
    const { container, config } = options
    let ctn: HTMLElement
    if (typeof container === 'string') {
      ctn = document.querySelector(container)
    } else {
      ctn = container
    }

    let backupConfig: PintoraConfig
    if (config) {
      backupConfig = configApi.cloneConfig()
      configStack.push(backupConfig)

      pintoraStandalone.setConfig(config)
    }

    let drawResult: ReturnType<typeof pintoraStandalone.parseAndDraw>
    try {
      drawResult = pintoraStandalone.parseAndDraw(code, options)
    } catch (error) {
      const onError = options.onError || console.warn
      onError(error)
    }

    try {
      if (drawResult) {
        let graphicIR = drawResult.graphicIR
        if (options.enhanceGraphicIR) graphicIR = options.enhanceGraphicIR(graphicIR)
        if (!graphicIR.bgColor) {
          const diagramIR: BaseDiagramIR = drawResult.diagramIR
          const conf = configApi.gnernateNewConfig<PintoraConfig>(diagramIR.overrideConfig || {})
          const canvasBackground = conf.themeConfig.themeVariables?.canvasBackground

          if (canvasBackground) graphicIR.bgColor = canvasBackground
        }

        render(graphicIR, {
          ...options,
          container: ctn,
        })
      }
    } finally {
      if (config && backupConfig) configApi.replaceConfig(backupConfig)
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
    const prevSibling = container.previousElementSibling
    if (prevSibling && prevSibling.classList.contains(CLASSES.wrapper)) {
      prevSibling.remove()
    }

    const wrapper = document.createElement('div')
    wrapper.classList.add(CLASSES.wrapper)
    container.style.display = 'none'

    const renderer: any =
      container.dataset.renderer || configApi.getConfig<PintoraConfig>().core?.defaultRenderer || 'svg'

    container.parentNode.insertBefore(wrapper, container)
    pintoraStandalone.renderTo(container.innerText, {
      container: wrapper,
      renderer,
    })
  },
  getConfig: configApi.getConfig,
  setConfig: configApi.setConfig,
}

export { BaseRenderer, rendererRegistry, PintoraConfig, tinycolor }

export { pintoraStandalone } // for @pintora/cli

export default pintoraStandalone
