import { RenderOptions, IRenderer } from '@pintora/renderer'
import { pintoraStandalone, PintoraConfig, DeepPartial } from '@pintora/standalone'
import './text-metric'
// import { Window } from 'happy-dom'
// import JSDOM from 'jsdom'
import { createHTMLWindow } from 'svgdom'

export const DEFAUT_BGS = {
  light: '#FFFFFF',
  dark: '#282A36',
}

export type RuntimeRenderOptions = {
  /**
   * pintora DSL to render
   */
  code: string
  /**
   * Assign extra background color
   */
  backgroundColor?: string
  pintoraConfig?: DeepPartial<PintoraConfig>
  /**
   * width of the output, height will be calculated according to the diagram content ratio
   */
  width?: number
}

function renderPrepare(opts: RuntimeRenderOptions) {
  const { code, backgroundColor, pintoraConfig } = opts
  // const dom = new JSDOM('<!DOCTYPE html><body></body>')
  // const dom = new Window()

  const window = createHTMLWindow()
  const document = window.document

  const container = document.createElement('div')
  container.id = 'pintora-container'

  const global = globalThis

  // setup the env for renderer
  ;(global as any).document = document

  return {
    container,
    pintorRender(renderOpts: Pick<RenderOptions, 'renderer'>) {
      let config = pintoraStandalone.getConfig<PintoraConfig>()
      if (pintoraConfig) {
        config = pintoraStandalone.configApi.gnernateNewConfig(pintoraConfig)
      }

      const containerSize = opts.width ? { width: opts.width } : undefined
      if (opts.width) {
        config = pintoraStandalone.configApi.gnernateNewConfig({ core: { useMaxWidth: true } })
      }

      return new Promise<IRenderer>((resolve, reject) => {
        pintoraStandalone.renderTo(code, {
          container,
          renderer: renderOpts.renderer || 'canvas',
          containerSize,
          enhanceGraphicIR(ir) {
            if (!ir.bgColor) {
              const themeVariables: Partial<PintoraConfig['themeConfig']['themeVariables']> =
                config.themeConfig.themeVariables || {}
              const newBgColor =
                backgroundColor ||
                themeVariables.canvasBackground ||
                (themeVariables.isDark ? DEFAUT_BGS.dark : DEFAUT_BGS.light)
              ir.bgColor = newBgColor
            }
            return ir
          },
          onRender(renderer) {
            resolve(renderer)
          },
          onError(e) {
            console.error('onError', e)
            reject(e)
          },
        })
      })
    },
  }
}

/**
 * @param opts - The RuntimeRenderOptions.
 * @returns A promise that resolves to the rendered output.
 */
export function doRender(opts: RuntimeRenderOptions) {
  const { pintorRender } = renderPrepare(opts)

  function renderToSvg() {
    return new Promise<string>((resolve, reject) => {
      pintorRender({ renderer: 'svg' })
        .then(renderer => {
          const rootElement = renderer.getRootElement() as SVGSVGElement
          rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          resolve(rootElement.outerHTML)
        })
        .catch(reject)
    })
  }
  return renderToSvg()
}
