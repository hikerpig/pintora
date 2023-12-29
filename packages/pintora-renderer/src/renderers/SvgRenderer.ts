import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Element as GElement } from '@antv/g'
import { Renderer } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getGRenderer() {
    return new Renderer()
  }

  override getRootElement() {
    if (!this.gcvs) return
    return (this.gcvs.context.contextService as any).$namespace
  }

  onShapeAdd(shape: GElement, mark: Mark) {
    super.onShapeAdd(shape, mark)

    if (mark.class) {
      const el = shape
      // TODO: some js dom implementation does not have classList
      if (el && el.classList) {
        shape.style.class = mark.class
      }
    }
  }
}

// https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
