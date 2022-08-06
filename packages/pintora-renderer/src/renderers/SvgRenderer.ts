import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Element as GElement } from '@antv/g'
import { Renderer } from '@antv/g-svg'

export class SvgRenderer extends BaseRenderer {
  getGRenderer() {
    // Disable automatic id generation, we'll manually set id for elements that need it
    return new Renderer({
      outputSVGElementId: false,
    })
  }

  override getRootElement() {
    if (!this.gcvs) return
    return (this.gcvs.context.contextService as any).$namespace
  }

  onShapeAdd(shape: GElement, mark: Mark) {
    super.onShapeAdd(shape, mark)

    if (mark.class) {
      const el = shape
      // some js dom implementation does not have classList
      if (el && el.classList) {
        shape.style.class = mark.class
      }
    }

    // Manually set id only for elements that have explicit id in attrs
    // This avoids the auto-generated g-svg-1, g-svg-2, etc. ids
    const explicitId = mark.attrs?.id
    if (explicitId) {
      // Set id on the SVG element directly via elementSVG
      const svgEl = (shape as any).elementSVG
      if (svgEl?.$el) {
        svgEl.$el.id = explicitId
      }
      if (svgEl?.$groupEl && svgEl.$groupEl !== svgEl.$el) {
        svgEl.$groupEl.id = explicitId
      }
    }
  }
}
