import { BaseRenderer } from './base'
import { Renderer } from '@antv/g-canvas'

export class CanvasRenderer extends BaseRenderer {
  getGRenderer() {
    return new Renderer()
  }
}
