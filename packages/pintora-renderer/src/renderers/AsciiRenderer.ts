import { configApi, GraphicsIR, GrahpicEventHandler, PintoraConfig } from '@pintora/core'
import { IRenderer } from '../type'
import { noop } from '../util'
import { resolveTextRendererOptions } from './ascii/config'
import { renderText } from './ascii/render-text'

export class AsciiRenderer implements IRenderer {
  private container: HTMLElement | null = null
  private rootElement: HTMLPreElement | null = null
  private textContent = ''

  constructor(private readonly ir: GraphicsIR) {}

  setContainer(container: HTMLElement) {
    this.container = container
    const doc = container.ownerDocument || ((globalThis as any).document as Document)
    if (doc) {
      this.rootElement = this.createRootElement(doc)
    }
    return this
  }

  render() {
    const config = configApi.getConfig<PintoraConfig>()
    const options = resolveTextRendererOptions(config)
    this.textContent = renderText(this.ir, options)

    const root = this.getRootElement() as HTMLPreElement
    root.textContent = this.textContent

    if (this.container) {
      this.container.innerHTML = ''
      this.container.appendChild(root)
    }
  }

  getRootElement(): Element {
    if (this.rootElement) return this.rootElement

    const doc = ((globalThis as any).document as Document | undefined) || undefined
    if (!doc) {
      throw new Error('AsciiRenderer requires a DOM-like document')
    }

    this.rootElement = this.createRootElement(doc)
    return this.rootElement
  }

  getTextContent() {
    return this.textContent
  }

  on(_name: string, _handler: GrahpicEventHandler) {
    return noop
  }

  private createRootElement(doc: Document): HTMLPreElement {
    const pre = doc.createElement('pre')
    pre.style.margin = '0'
    pre.style.whiteSpace = 'pre'
    pre.style.fontFamily = 'monospace'
    pre.style.lineHeight = '1'
    return pre
  }
}
