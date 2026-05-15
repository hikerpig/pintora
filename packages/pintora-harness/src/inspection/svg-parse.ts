import { JSDOM } from 'jsdom'

export function withSvgRoot<T>(svgText: string, fn: (root: Element) => T): T {
  const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' })
  try {
    const root = dom.window.document.querySelector('svg')
    if (!root) throw new Error('Invalid svg: missing <svg> root')
    return fn(root)
  } finally {
    dom.window.close()
  }
}
