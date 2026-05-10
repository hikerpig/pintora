const DEFAULT_FONT_SIZE = 14
const DEFAULT_LINE_HEIGHT = 18
const DEFAULT_CHAR_WIDTH = 8.4
const DEFAULT_PADDING = 16

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (isWideChar(ch) ? 2 : 1), 0)
}

function isWideChar(ch: string) {
  return /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\uff01-\uff60\uffe0-\uffe6]/u.test(ch)
}

function escapeXml(input: string) {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderAsciiPreviewSvg(text: string) {
  const lines = text.split(/\n/)
  const maxColumns = lines.reduce((max, line) => Math.max(max, widthOf(line)), 0)
  const width = Math.ceil(maxColumns * DEFAULT_CHAR_WIDTH + DEFAULT_PADDING * 2)
  const height = Math.ceil(lines.length * DEFAULT_LINE_HEIGHT + DEFAULT_PADDING * 2)
  const firstBaseline = DEFAULT_PADDING + DEFAULT_FONT_SIZE

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : DEFAULT_LINE_HEIGHT
      return `<tspan x="${DEFAULT_PADDING}" dy="${dy}">${escapeXml(line)}</tspan>`
    })
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    `<text x="${DEFAULT_PADDING}" y="${firstBaseline}" font-family="Source Code Pro, Menlo, Consolas, monospace" font-size="${DEFAULT_FONT_SIZE}" xml:space="preserve">${tspans}</text>`,
    '</svg>',
  ].join('')
}
