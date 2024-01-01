import type { TSize } from './geometry'
export interface IFont {
  fontFamily?: string
  fontSize: number
  fontWeight?: any
}

export interface ITextMetricCalculator {
  name?: string
  calculateTextDimensions(text: string, font?: IFont): TSize
}

export type TTextMetrics = Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent' | 'width'>

/**
 * Use canvas Context2D `measureText()` method to calculate text metrics.
 */
class CanvasTextMetricCalculator implements ITextMetricCalculator {
  name = 'CanvasTextMetricCalculator'
  ctx: CanvasRenderingContext2D | undefined = undefined

  calculateTextDimensions(text: string, font?: IFont) {
    const lines = text.split('\n')
    let width = 0
    let height = 0
    const fontSize = font?.fontSize || 14
    lines.forEach((line, i) => {
      const lineMetric = this.getLineMetric(line, font)
      // console.log('line metric', line, lineMetric)
      const w = lineMetric.width
      width = Math.max(w, width)
      // svg renderer antv/g currently adds tspan dy with '1em', which matches fontSize
      // so we will calculate height with similar method
      // TODO: but it has some differences with canvas
      let lineHeight = fontSize
      if (i === 0) {
        if ('actualBoundingBoxDescent' in lineMetric) {
          lineHeight = lineMetric.actualBoundingBoxAscent + lineMetric.actualBoundingBoxDescent
        }
      }
      height += lineHeight
    })
    // console.log('calculateTextDimensions:', text, width, height)
    return {
      width,
      height,
    }
  }

  getLineMetric(text: string, font?: IFont) {
    const fontSize = font?.fontSize || 14
    const fontFamily = font?.fontFamily || 'sans-serif'
    const ctx = this.getCanvasContext()
    ctx.font = `${fontSize}px ${fontFamily}`
    return ctx.measureText(text)
  }

  /** A helper canvas context 2D for measuring text */
  getCanvasContext = () => {
    if (!this.ctx) {
      const canvas = document.createElement('canvas')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.ctx = canvas.getContext('2d')!
    }
    return this.ctx
  }
}

const canvasTextCalculator = new CanvasTextMetricCalculator()

/**
 * A bridge for text metric calculator, can be set to use different implementation in different environment.
 * By default it uses {@link CanvasTextMetricCalculator}.
 */
class TextMetricBridge implements ITextMetricCalculator {
  protected calculator: ITextMetricCalculator = canvasTextCalculator
  setImpl(calculator: ITextMetricCalculator) {
    this.calculator = calculator
  }
  calculateTextDimensions(text: string, font?: IFont | undefined) {
    return this.calculator.calculateTextDimensions(text, font)
  }
}

export const textMetrics = new TextMetricBridge()

export function calculateTextDimensions(text: string, font?: IFont) {
  return textMetrics.calculateTextDimensions(text, font)
}
