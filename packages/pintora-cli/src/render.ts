import { pintoraStandalone } from '@pintora/standalone'
import { JSDOM } from 'jsdom'
import { implForWrapper } from 'jsdom/lib/jsdom/living/generated/utils'
import { Canvas } from 'canvas'

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
]

export type CLIRenderOptions = {
  code: string
  devicePixelRatio?: number | null
  mimeType?: string
  backgroundColor?: string
  // width?: number
  // height?: number
}

export function render(opts: CLIRenderOptions) {
  const { code, backgroundColor } = opts
  const devicePixelRatio = opts.devicePixelRatio || 2
  const mimeType = opts.mimeType || 'image/png'

  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const document = dom.window.document
  const container = document.createElement('div')
  container.id = 'pintora-container'

  // setup the env for renderer
  global.window = dom.window as any
  global.document = document
  ;(dom.window as any).devicePixelRatio = devicePixelRatio

  return new Promise<Buffer>((resolve, reject) => {
    pintoraStandalone.renderTo(code, {
      container,
      renderer: 'canvas',
      enhanceGraphicIR(ir) {
        if (backgroundColor && !ir.bgColor) ir.bgColor = backgroundColor
        return ir
      },
      onRender(renderer) {
        setTimeout(() => {
          const buf = getBuf(renderer.getRootElement() as HTMLCanvasElement)
          resolve(buf)
        }, 20)
      },
      onError(e) {
        console.error('onError', e)
      },
    })
  })

  function getBuf(canvas: HTMLCanvasElement) {
    // currently jsdom only support node-canvas,
    // and this is it's not-so-stable method for getting the underlying node-canvas instance
    const wrapper = implForWrapper(canvas)
    const nodeCanvas: Canvas = wrapper._canvas
    const context = nodeCanvas.getContext('2d')
    context.quality = 'best'
    context.patternQuality = 'best'
    console.log('mime type', mimeType)
    const buf = nodeCanvas.toBuffer(mimeType as any)
    return buf
  }
}
