import pintora, {
  configApi,
  GraphicsIR,
  PintoraConfig,
  tinycolor,
  safeAssign,
  DiagramArtistOptions,
  DeepPartial,
  diagramEventManager,
  DiagramEventType,
  IDiagramEvent,
} from '@pintora/core'
export * from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
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

interface RenderToOptions extends Omit<RenderOptions, 'container'>, DiagramArtistOptions {
  container: HTMLElement | string
  onError?(error: Error): void
  enhanceGraphicIR?(ir: GraphicsIR): GraphicsIR
  config?: DeepPartial<PintoraConfig>
  /**
   * An option dict to specify different types of diagram event listeners
   */
  eventsHandlers?: Partial<DiagramEventsHandlers>
}

export type DiagramEventsHandlers = {
  [K in DiagramEventType]: (diagramEvent: IDiagramEvent) => void
}

type RenderContentOptions = {
  /**
   * sometimes you want to customize content rather than simply `innerText`
   */
  getContent?(container: HTMLElement): string | undefined
  /**
   * destination container for result element,
   * if not specified, pintora will create a '.pintora-wrapper' element and insert it before the container
   */
  resultContainer?: HTMLElement
} & Pick<RenderToOptions, 'eventsHandlers'>

type ConfigOnElement = {
  renderer: string
  theme: string
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
      const containerSize = {
        width: ctn.clientWidth,
      }
      drawResult = pintoraStandalone.parseAndDraw(code, safeAssign<RenderToOptions>({ containerSize }, options))
    } catch (error) {
      const onError = options.onError || console.warn
      onError(error)
    }

    try {
      if (drawResult) {
        let graphicIR = drawResult.graphicIR
        if (options.enhanceGraphicIR) graphicIR = options.enhanceGraphicIR(graphicIR)
        if (!graphicIR.bgColor) {
          const diagramIR: any = drawResult.diagramIR
          const conf = configApi.gnernateNewConfig<PintoraConfig>(diagramIR.overrideConfig || {})
          const canvasBackground = conf.themeConfig.themeVariables?.canvasBackground

          if (canvasBackground) graphicIR.bgColor = canvasBackground
        }

        const originOnRender = options.onRender
        render(graphicIR, {
          ...options,
          container: ctn,
          onRender(renderer) {
            diagramEventManager.wireCurrentEventsToRenderer(renderer, drawResult.diagramIR)

            if (options.eventsHandlers) {
              for (const [eventName, handler] of Object.entries(options.eventsHandlers)) {
                diagramEventManager.wireDiagramEventToRenderer(
                  renderer,
                  eventName as DiagramEventType,
                  handler,
                  drawResult.diagramIR,
                )
              }
            }

            if (originOnRender) originOnRender(renderer)
          },
        })
      }
    } finally {
      if (config && backupConfig) {
        configApi.replaceConfig(backupConfig)
        configStack.pop()
      }
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
  renderContentOf(container: HTMLElement, opts: RenderContentOptions = {}) {
    let resultContainer = opts.resultContainer

    if (!resultContainer) {
      const prevSibling = container.previousElementSibling
      if (prevSibling && prevSibling.classList.contains(CLASSES.wrapper)) {
        prevSibling.remove()
      }

      const wrapper = document.createElement('div')
      wrapper.classList.add(CLASSES.wrapper)
      container.style.display = 'none'

      if (container.parentNode) {
        container.parentNode.insertBefore(wrapper, container)
      }

      resultContainer = wrapper
    }

    const configFromEle = pintoraStandalone.getConfigFromElement(container)
    const renderer: any = configFromEle.renderer || configApi.getConfig<PintoraConfig>().core?.defaultRenderer || 'svg'

    let config: DeepPartial<PintoraConfig> | null = null
    if (configFromEle.theme) {
      config = {
        themeConfig: {
          theme: configFromEle.theme,
        },
      }
    }

    const code = opts.getContent ? opts.getContent(container) : container.innerText

    pintoraStandalone.renderTo(code, {
      container: resultContainer,
      renderer,
      config,
      eventsHandlers: opts.eventsHandlers,
    })

    return resultContainer
  },
  /**
   * Get pintora config from element's dataset, some available configs:
   * - `data-renderer`
   * - `data-theme`
   */
  getConfigFromElement(ele: HTMLElement) {
    const output = ['renderer', 'theme'].reduce((acc, k) => {
      const v = ele.dataset[k]
      if (v) {
        acc[k] = v
      }
      return acc
    }, {} as Partial<ConfigOnElement>)
    return output
  },
  getConfig: configApi.getConfig,
  setConfig: configApi.setConfig,
}

export { BaseRenderer, rendererRegistry, PintoraConfig, tinycolor }

export { pintoraStandalone } // for @pintora/cli

export default pintoraStandalone
