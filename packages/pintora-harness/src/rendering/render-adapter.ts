import type { RenderOptions, IRenderer } from '@pintora/renderer'
import { pintoraStandalone, type PintoraConfig, type DeepPartial } from '@pintora/standalone'
import { CanvasPattern } from 'canvas'
import { JSDOM } from 'jsdom'

const DEFAULT_BACKGROUND = {
  light: '#FFFFFF',
  dark: '#282A36',
}

type HarnessRenderSvgOptions = {
  code: string
  backgroundColor?: string
  pintoraConfig?: DeepPartial<PintoraConfig>
  width?: number
}

class GlobalPatcher {
  private records: Record<string, { descriptor?: PropertyDescriptor; prevValue: unknown; value: unknown }> = {}

  set<K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    const prevValue = globalThis[key]
    this.records[key as string] = { descriptor, prevValue, value }

    if (!descriptor || descriptor.writable) {
      globalThis[key] = value
      return
    }

    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      writable: true,
      value,
    })
  }

  restore() {
    for (const [key, record] of Object.entries(this.records)) {
      if ((globalThis as Record<string, unknown>)[key] !== record.value) continue
      if (record.descriptor) {
        Object.defineProperty(globalThis, key, record.descriptor)
      } else {
        ;(globalThis as Record<string, unknown>)[key] = record.prevValue
      }
    }
  }
}

function prepareRender(opts: HarnessRenderSvgOptions) {
  const dom = new JSDOM('<!DOCTYPE html><body></body>')
  const document = dom.window.document
  const container = document.createElement('div')
  container.id = 'pintora-harness-container'

  const patcher = new GlobalPatcher()
  patcher.set('window', dom.window as unknown as typeof globalThis.window)
  patcher.set('document', document as unknown as typeof globalThis.document)
  patcher.set('CanvasPattern', CanvasPattern as unknown as typeof globalThis.CanvasPattern)
  ;((dom.window as unknown) as { devicePixelRatio: number }).devicePixelRatio = 2

  const renderOptions: Pick<RenderOptions, 'renderer'> = { renderer: 'svg' }

  return new Promise<{ renderer: IRenderer; cleanup(): void }>((resolve, reject) => {
    let config = pintoraStandalone.getConfig<PintoraConfig>()
    if (opts.pintoraConfig) {
      config = pintoraStandalone.configApi.gnernateNewConfig(opts.pintoraConfig)
    }

    const containerSize = opts.width ? { width: opts.width } : undefined
    if (opts.width) {
      config = pintoraStandalone.configApi.gnernateNewConfig({ core: { useMaxWidth: true } })
    }

    pintoraStandalone.renderTo(opts.code, {
      container,
      renderer: renderOptions.renderer,
      containerSize,
      enhanceGraphicIR(ir) {
        if (!ir.bgColor) {
          const themeVariables: Partial<PintoraConfig['themeConfig']['themeVariables']> =
            config.themeConfig.themeVariables || {}
          ir.bgColor =
            opts.backgroundColor ||
            themeVariables.canvasBackground ||
            (themeVariables.isDark ? DEFAULT_BACKGROUND.dark : DEFAULT_BACKGROUND.light)
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
      onError(error) {
        patcher.restore()
        reject(error)
      },
    })
  })
}

export async function renderHarnessSvg(opts: HarnessRenderSvgOptions) {
  const { renderer, cleanup } = await prepareRender(opts)

  try {
    const rootElement = renderer.getRootElement() as SVGSVGElement
    rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return rootElement.outerHTML
  } finally {
    cleanup()
  }
}
