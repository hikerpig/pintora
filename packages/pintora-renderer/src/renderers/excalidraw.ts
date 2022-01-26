import svgToEx from 'svg-to-excalidraw'
import { Mark } from '@pintora/core'
import { BaseRenderer } from './base'
import { Canvas, IShape } from '@antv/g-svg'

export class ExcalidrawRenderer extends BaseRenderer {
  getCanvasClass() {
    return Canvas
  }

  onShapeAdd(shape: IShape, mark: Mark) {
    if (mark.class) {
      const el = shape.get('el')
      if (el) {
        mark.class.split(' ').forEach(cls => {
          if (cls) el.classList.add(cls)
        })
      }
    }
  }
  render() {
    super.render()
    const rootElement = this.getRootElement() as SVGSVGElement
    rootElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    try {
      const svg = rootElement.outerHTML
      const excali = svgToEx.convert(svg)
      console.log('excali', excali, excali.hasErrors)
    } catch (error) {
      console.error('error in converting', error)
    }
  }
}
