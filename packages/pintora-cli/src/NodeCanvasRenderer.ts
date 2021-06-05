import { BaseRenderer } from '@pintora/standalone'
import { Canvas } from '@antv/g-canvas'

export class NodeCanvasRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }
}

