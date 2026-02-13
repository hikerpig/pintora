import { textDisplayWidth } from './char-width'

export type AsciiTextMetrics = {
  lines: string[]
  textWidthCells: number
  textWidth: number
  textHeightRows: number
  textHeight: number
  lineHeightRows: number
  lineHeight: number
}

export function measureAsciiText(
  text: string,
  opts: {
    cellWidth: number
    cellHeight: number
    lineHeight?: number
  },
): AsciiTextMetrics {
  const lines = text.split('\n')
  const textWidthCells = Math.max(...lines.map(line => textDisplayWidth(line)), 0)
  const lineHeight = Number(opts.lineHeight || opts.cellHeight)
  const lineHeightRows = Math.max(1, Math.ceil(lineHeight / opts.cellHeight))
  const textHeightRows = 1 + Math.max(0, lines.length - 1) * lineHeightRows

  return {
    lines,
    textWidthCells,
    textWidth: textWidthCells * opts.cellWidth,
    textHeightRows,
    textHeight: textHeightRows * opts.cellHeight,
    lineHeightRows,
    lineHeight,
  }
}
