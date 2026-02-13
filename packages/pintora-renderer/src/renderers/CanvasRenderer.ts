import { BaseRenderer } from './base'
import { Renderer } from '@antv/g-canvas'

export class CanvasRenderer extends BaseRenderer {
  getGRenderer() {
    return new Renderer()
  }

  override getRootElement() {
    if (!this.gcvs) return
    return (this.gcvs.context.contextService as any).$canvas
  }
}
