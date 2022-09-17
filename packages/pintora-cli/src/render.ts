import { RenderOptions, IRenderer } from '@pintora/renderer'
import { pintoraStandalone, PintoraConfig } from '@pintora/standalone'
import { JSDOM } from 'jsdom'
import { implForWrapper } from 'jsdom/lib/jsdom/living/generated/utils'
import { Canvas, CanvasPattern } from 'canvas'
import { SVG_MIME_TYPE, DEFAUT_BGS } from './const'

export type CLIRenderOptions = {
  code: string
  devicePixelRatio?: number | null
  mimeType?: string
  backgroundColor?: string
  pintoraConfig?: Partial<PintoraConfig>
  width?: number
  // height?: number
}

function renderPrepare(opts: CLIRenderOptions) {
  const { code, backgroundColor, pintoraConfig } = opts
  const devicePixelRatio = opts.devicePixelRatio || 2

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const document = dom.window.document
  const container = document.createElement('div')
  container.id = 'pintora-container'

  // setup the env for renderer
  global.window = dom.window as any
  global.document = document
  ;(dom.window as any).devicePixelRatio = devicePixelRatio
  ;(global as any).CanvasPattern = CanvasPattern

  return {
    container,
    pintorRender(renderOpts: Pick<RenderOptions, 'renderer'>) {
      if (pintoraConfig) {
        pintoraStandalone.setConfig(pintoraConfig)
      }

      const containerSize = opts.width ? { width: opts.width } : undefined
      if (opts.width) {
        pintoraStandalone.setConfig({
          core: { useMaxWidth: true },
        })
      }

      return new Promise<IRenderer>((resolve, reject) => {
        pintoraStandalone.renderTo(code, {
          container,
          renderer: renderOpts.renderer || 'canvas',
          containerSize,
          enhanceGraphicIR(ir) {
            if (!ir.bgColor) {
              const themeVariables = pintoraStandalone.getConfig<PintoraConfig>().themeConfig.themeVariables
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

export function render(opts: CLIRenderOptions) {
  const mimeType = opts.mimeType || 'image/png'

  const { pintorRender } = renderPrepare(opts)

  const isSvg = mimeType === SVG_MIME_TYPE
  if (isSvg) {
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
  } else {
    function renderToImageBuffer() {
      return new Promise<Buffer>((resolve, reject) => {
        pintorRender({ renderer: 'canvas' })
          .then(renderer => {
            setTimeout(() => {
              const buf = getBuf(renderer.getRootElement() as HTMLCanvasElement)
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
