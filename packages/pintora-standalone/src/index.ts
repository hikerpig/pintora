import pintora, { configApi, GraphicsIR, PintoraConfig } from '@pintora/core'
export * from '@pintora/core'
import { DIAGRAMS, THEMES, ITheme } from '@pintora/diagrams'
import { render, RenderOptions, BaseRenderer, rendererRegistry } from '@pintora/renderer'
import 'tinycolor2'

function initDiagrams() {
  Object.keys(DIAGRAMS).forEach(name => {
    pintora.diagramRegistry.registerDiagram(name, DIAGRAMS[name])
  })
}
initDiagrams()

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

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
    let ctn: HTMLDivElement
    if (typeof container === 'string') {
      ctn = document.querySelector(container) as any
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
          const conf = configApi.getConfig<PintoraConfig>()
          const canvasBackground = conf.themeConfig.themeVariables?.canvasBackground
          if (canvasBackground) graphicIR.bgColor = canvasBackground
        }

        render(graphicIR, options)
      }
    } finally {
      if (config) configApi.replaceConfig(backupConfig)
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
  setConfig(c: DeepPartial<PintoraConfig>) {
    configApi.setConfig(c)
    if (c.themeConfig?.theme) {
      const conf = configApi.getConfig<PintoraConfig>()
      const newConf = { ...conf }
      const themeVars = THEMES[c.themeConfig.theme]
      const configThemeVars = c.themeConfig.themeVariables
      if (themeVars) {
        newConf.themeConfig = newConf.themeConfig || ({} as any)
        newConf.themeConfig.themeVariables = { ...themeVars }
      }
      if (configThemeVars) {
        Object.assign(newConf.themeConfig.themeVariables, configThemeVars)
      }
      configApi.setConfig(newConf)
    }
  },
  registerTheme(name: string, variables: ITheme) {
    if (THEMES[name]) {
      console.warn(`[pintora] override theme ${name}`)
    }
    THEMES[name] = variables
  },
}

export { BaseRenderer, rendererRegistry, PintoraConfig, ITheme, THEMES }

export { pintoraStandalone } // for @pintora/cli

export default pintoraStandalone
