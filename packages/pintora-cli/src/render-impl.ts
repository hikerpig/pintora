import { RenderOptions, IRenderer } from '@pintora/renderer'
import { pintoraStandalone, PintoraConfig } from '@pintora/standalone'
import { JSDOM } from 'jsdom'
import { implForWrapper } from 'jsdom/lib/jsdom/living/generated/utils'
import { Canvas } from 'canvas'
import { SVG_MIME_TYPE, TEXT_MIME_TYPE, DEFAUT_BGS } from './const'
import type { CLIRenderOptions } from './type'

export type { CLIRenderOptions } from './type'

/**
 * records how many globals we have patched,
 *  need to restore them later to prevent polluting the global environment
 */
class GlobalPatcher {
  private records: any = {}
  set<K extends keyof typeof globalThis>(k: K, v: any) {
    const prevValue = globalThis[k]
    this.records[k] = {
      prevValue,
      value: v,
    }

    globalThis[k] = v
  }

  restore() {
    for (const k in this.records) {
      if ((globalThis as any)[k] === this.records[k].value) {
        ;(globalThis as any)[k] = this.records[k].prevValue
      }
    }
  }
}

function renderPrepare(opts: CLIRenderOptions) {
  const { code, backgroundColor, pintoraConfig } = opts

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const document = dom.window.document
  const container = document.createElement('div')
  container.id = 'pintora-container'

  // setup the env for renderer
  const patcher = new GlobalPatcher()
  patcher.set('document', document)

  // Mock browser APIs for @antv/g v6
  patcher.set('navigator', {})
  // @antv/g v6 also uses addEventListener on globalThis
  if (typeof globalThis.addEventListener !== 'function') {
    ;(globalThis as any).addEventListener = () => {}
    ;(globalThis as any).removeEventListener = () => {}
  }

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

      return new Promise<{ renderer: IRenderer; cleanup(): void }>((resolve, reject) => {
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
            resolve({
              renderer,
              cleanup() {
                patcher.restore()
              },
            })
          },
          onError(e) {
            console.error('onError', e)
            patcher.restore()
            reject(e)
          },
        })
      })
    },
  }
}

/**
 * Renders the Pintora CLI options to the specified output format.
 * @param opts - The CLIRenderOptions.
 * @returns A promise that resolves to the rendered output.
 */
export function render(opts: CLIRenderOptions) {
  const mimeType = opts.mimeType || 'image/png'

  const { pintorRender } = renderPrepare(opts)

  const isSvg = mimeType === SVG_MIME_TYPE
  const isText = mimeType === TEXT_MIME_TYPE
  if (isSvg) {
    function renderToSvg() {
      return new Promise<string>((resolve, reject) => {
        pintorRender({ renderer: 'svg' })
          .then(({ renderer, cleanup }) => {
            const rootElement = renderer.getRootElement() as SVGSVGElement
            rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
            const html = rootElement.outerHTML
            cleanup()
            resolve(html)
          })
          .catch(reject)
      })
    }
    return renderToSvg()
  } else if (isText) {
    function renderToText() {
      return new Promise<string>((resolve, reject) => {
        pintorRender({ renderer: 'ascii' })
          .then(({ renderer, cleanup }) => {
            const text = renderer.getTextContent?.() || renderer.getRootElement()?.textContent || ''
            cleanup()
            resolve(text)
          })
          .catch(reject)
      })
    }
    return renderToText()
  } else {
    function renderToImageBuffer() {
      return new Promise<Buffer>((resolve, reject) => {
        pintorRender({ renderer: 'canvas' })
          .then(({ renderer, cleanup }) => {
            setTimeout(() => {
              const buf = getBuf(renderer.getRootElement() as HTMLCanvasElement)
              cleanup()
              resolve(buf)
            }, 20)
          })
          .catch(reject)
      })

      function getBuf(canvas: HTMLCanvasElement) {
        // currently jsdom only support node-canvas,
        // and this is it's not-so-stable method for getting the underlying node-canvas instance
        const wrapper = implForWrapper(canvas)
        const nodeCanvas: Canvas = wrapper._canvas
        const context = nodeCanvas.getContext('2d')
        context.quality = 'best'
        context.patternQuality = 'best'
        const buf = nodeCanvas.toBuffer(mimeType as any)
        return buf
      }
    }
    return renderToImageBuffer()
  }
}
