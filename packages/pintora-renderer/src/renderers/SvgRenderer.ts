import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Canvas, Group, IShape } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }

  onShapeAdd(shape: IShape, mark: Mark) {
    if (mark.class) {
      const el = shape.get('el')
      if (el) el.classList.add(mark.class)
    }
  }
}

