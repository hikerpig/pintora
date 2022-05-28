import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Canvas, IShape } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
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
