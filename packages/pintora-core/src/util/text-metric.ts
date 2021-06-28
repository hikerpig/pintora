export interface IFont {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
}

export function calculateTextDimensions(text: string, font?: IFont) {
  const lines = text.split('\n')
  let width = 0
  let height = 0
  const fontSize = font?.fontSize || 14
  lines.forEach((line, i) => {
    const lineMetric = getLineMetric(line, font)
    // console.log('line metric', line, lineMetric)
    const w = lineMetric.width
    width = Math.max(w, width)
    height += fontSize + (i === 0 ? 0 : 8)
  })
  // console.log('calculateTextDimensions', text, width, height)
  return {
    width,
    height,
  }
}

let ctx: CanvasRenderingContext2D
/** A helper canvas context 2D for measuring text */
const getCanvasContext = () => {
  if (!ctx) {
    const canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d') as any
  }
  return ctx
}

function getLineMetric(text: string, font?: IFont) {
  const fontSize = font?.fontSize || 14
  const fontFamily = font?.fontFamily || 'sans-serif'
  const ctx = getCanvasContext()
  ctx.font = `${fontSize}px ${fontFamily}`
  return ctx.measureText(text)
}
