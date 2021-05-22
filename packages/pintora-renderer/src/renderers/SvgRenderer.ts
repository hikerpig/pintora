import { BaseRenderer } from './base'
import { Canvas, Group, IShape } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }
}

