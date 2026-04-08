import { JSDOM } from 'jsdom'

export function parseSvg(svgText: string) {
  const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' })
  const root = dom.window.document.querySelector('svg')
  if (!root) throw new Error('Invalid svg: missing <svg> root')
  return { dom, root }
}
