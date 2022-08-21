import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Canvas, IShape } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }

  preProcessMarkAttrs(mark: Mark) {
    if (mark.type === 'text') {
      return {
        ...mark.attrs,
        text: escapeHtml(mark.attrs.text),
      }
    }
    return mark.attrs!
  }

  onShapeAdd(shape: IShape, mark: Mark) {
    super.onShapeAdd(shape, mark)

    if (mark.class) {
      const el = shape.get('el')
      if (el) {
        mark.class.split(' ').forEach(cls => {
          if (cls) el.classList.add(cls)
        })
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
