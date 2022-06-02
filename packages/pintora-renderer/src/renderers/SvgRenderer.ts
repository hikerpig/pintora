import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Element as GElement } from '@antv/g'
import { Renderer } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getGRenderer() {
    return new Renderer()
  }

  onShapeAdd(shape: GElement, mark: Mark) {
    super.onShapeAdd(shape, mark)

    if (mark.class) {
      const el = shape
      if (el) {
        shape.style.class = mark.class
      }
    }
  }
}
