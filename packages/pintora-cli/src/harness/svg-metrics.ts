export type SvgMetricSnapshot = {
  viewBox: { x: number; y: number; width: number; height: number } | null
  textNodes: Array<{ text: string; x: number; y: number }>
  elementCounts: Record<string, number>
  minTextToEdge: number | null
}

function readNumericAttr(node: Element, name: string) {
  const raw = node.getAttribute(name)
  if (raw == null) return null
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : null
}

function countElements(root: Element, tagNames: string[]) {
  return Object.fromEntries(tagNames.map(tagName => [tagName, root.querySelectorAll(tagName).length]))
}

function parseViewBox(root: Element) {
  const raw = root.getAttribute('viewBox')
  if (raw) {
    const parts = raw
      .trim()
      .split(/[\s,]+/)
      .map(part => Number.parseFloat(part))
    if (parts.length === 4 && parts.every(part => Number.isFinite(part))) {
      const [x, y, width, height] = parts
      return { x, y, width, height }
    }
  }

  const width = readNumericAttr(root, 'width')
  const height = readNumericAttr(root, 'height')
  if (width == null || height == null) return null
  return { x: 0, y: 0, width, height }
}

export function buildSvgMetrics(root: Element): SvgMetricSnapshot {
  const viewBox = parseViewBox(root)
  const textNodes = Array.from(root.querySelectorAll('text'))
    .map(node => {
      const x = readNumericAttr(node, 'x')
      const y = readNumericAttr(node, 'y')
      if (x == null || y == null) return null
      return {
        text: node.textContent?.trim() || '',
        x,
        y,
      }
    })
    .filter((item): item is { text: string; x: number; y: number } => Boolean(item))

  const minTextToEdge =
    viewBox && textNodes.length > 0
      ? Math.min(
          ...textNodes.flatMap(node => [
            node.x - viewBox.x,
            node.y - viewBox.y,
            viewBox.x + viewBox.width - node.x,
            viewBox.y + viewBox.height - node.y,
          ]),
        )
      : null

  return {
    viewBox,
    textNodes,
    elementCounts: countElements(root, ['text', 'rect', 'line', 'path', 'polygon']),
    minTextToEdge,
  }
}
