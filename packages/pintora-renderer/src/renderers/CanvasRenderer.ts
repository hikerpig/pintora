import { BaseRenderer } from './base'
import { Canvas } from '@antv/g-canvas'

export class CanvasRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }
}
