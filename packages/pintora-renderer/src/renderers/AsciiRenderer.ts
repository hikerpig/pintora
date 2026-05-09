import { GraphicsIR } from '@pintora/core'
import { IRenderer } from '../type'
import { noop } from '../util'
import { renderTextDiagramPlan } from './ascii/text-plan-renderer'

export class AsciiRenderer implements IRenderer {
  protected container: HTMLElement | null = null
  protected rootElement: HTMLElement | null = null
  protected textContent = ''

  constructor(protected ir: GraphicsIR) {}

  setContainer(container: HTMLElement) {
    this.container = container
    const doc = container.ownerDocument || globalThis.document
    if (doc) this.rootElement = this.createRootElement(doc)
    return this
  }

  render() {
    const plan = this.ir.rendererData?.ascii?.plan
    this.textContent = plan ? renderTextDiagramPlan(plan) : ''
    const root = this.getRootElement()
    root.textContent = this.textContent
    if (this.container) {
      this.container.innerHTML = ''
      this.container.appendChild(root)
    }
  }

  getRootElement() {
    if (this.rootElement) return this.rootElement
    const doc = globalThis.document
    if (!doc) throw new Error('AsciiRenderer requires a DOM-like document')
    this.rootElement = this.createRootElement(doc)
    return this.rootElement
  }

  getTextContent() {
    return this.textContent
  }

  on() {
    return noop
  }

  protected createRootElement(doc: Document) {
    const pre = doc.createElement('pre')
    pre.style.margin = '0'
    pre.style.whiteSpace = 'pre'
    pre.style.fontFamily = 'monospace'
    pre.style.lineHeight = '1'
    return pre
  }
}
