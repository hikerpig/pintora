import { textMetrics, IFont, ITextMetricCalculator } from '@pintora/standalone'
import { Font, create } from 'fontkit'
import fontData from '../fonts/SourceCodePro-Medium.ttf'
import { Buffer } from 'buffer'

const b = Buffer.from(fontData)
const defaultFont = create(b)
const fonts: Record<string, Font> = {
  'sans-serif': defaultFont,
  'Source Code Pro': defaultFont,
}

class FontkitCalculator implements ITextMetricCalculator {
  name = 'fontkit'
  getLineMetric(text: string, fontConfig?: IFont) {
    const fontSize = fontConfig?.fontSize || 14
    const fontName = fontConfig?.fontFamily || 'sans-serif'
    const font = fonts[fontName] || defaultFont
    const glyph = font.layout(text)
    const sizeUnit = fontSize / font.unitsPerEm
    // const width = glyph.glyphs.reduce((last, curr) => last + curr.cbox.width, 0) * sizeUnit
    const width = glyph.bbox.width * sizeUnit // fine

    const glyphActualMaxHeight = glyph.glyphs.reduce((last, curr) => Math.max(last, curr.cbox.height), 0) * sizeUnit
    const height = glyphActualMaxHeight

    const actualBoundingBoxAscent = height
    // console.log('line:', text, 'width', width, 'actualBoundingBoxAscent', actualBoundingBoxAscent)
    const actualBoundingBoxDescent = 0
    return {
      actualBoundingBoxAscent,
      actualBoundingBoxDescent,
      width,
    }
  }

  calculateTextDimensions(text: string, font?: IFont) {
    const lines = text.split('\n')
    let width = 0
    let height = 0
    const fontSize = font?.fontSize || 14
    lines.forEach((line, i) => {
      const lineMetric = this.getLineMetric(line, font)
      const w = lineMetric.width
      width = Math.max(w, width)
      let lineHeight = fontSize
      if ('actualBoundingBoxDescent' in lineMetric) {
        lineHeight = lineMetric.actualBoundingBoxAscent + lineMetric.actualBoundingBoxDescent
      }
      height += lineHeight
    })
    // console.log('[fontkit] text dimensions:', text, width, height)
    return {
      width,
      height,
    }
  }
}

textMetrics.setImpl(new FontkitCalculator())
