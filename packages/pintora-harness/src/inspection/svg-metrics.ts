export type SvgMetricSnapshot = {
  viewBox: { x: number; y: number; width: number; height: number } | null
  rootChildCount: number
  textNodes: Array<{ text: string; x: number; y: number }>
  elementCounts: Record<string, number>
  minTextToEdge: number | null
}

type Matrix = [number, number, number, number, number, number]

const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0]

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

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = left
  const [a2, b2, c2, d2, e2, f2] = right
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}

function applyMatrix(matrix: Matrix, point: { x: number; y: number }) {
  const [a, b, c, d, e, f] = matrix
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
  }
}

function parseNumberList(raw: string) {
  const matches = raw.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)
  if (!matches) return []
  return matches.map(item => Number.parseFloat(item)).filter(Number.isFinite)
}

function parseTransformPart(name: string, args: number[]): Matrix | null {
  switch (name) {
    case 'matrix':
      return args.length >= 6 ? [args[0], args[1], args[2], args[3], args[4], args[5]] : null
    case 'translate':
      return args.length >= 1 ? [1, 0, 0, 1, args[0], args[1] || 0] : null
    case 'scale': {
      if (args.length < 1) return null
      const sx = args[0]
      const sy = args.length >= 2 ? args[1] : sx
      return [sx, 0, 0, sy, 0, 0]
    }
    default:
      return null
  }
}

function parseTransform(raw: string | null): Matrix {
  if (!raw) return IDENTITY_MATRIX

  let matrix = IDENTITY_MATRIX
  for (const match of raw.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) {
    const transform = parseTransformPart(match[1], parseNumberList(match[2]))
    if (transform) matrix = multiplyMatrix(matrix, transform)
  }
  return matrix
}

function getNodeTransform(root: Element, node: Element): Matrix {
  const chain: Element[] = []
  let current: Element | null = node
  while (current) {
    chain.unshift(current)
    if (current === root) break
    current = current.parentElement
  }

  return chain.reduce(
    (matrix, item) => multiplyMatrix(matrix, parseTransform(item.getAttribute('transform'))),
    IDENTITY_MATRIX,
  )
}

export function buildSvgMetrics(root: Element): SvgMetricSnapshot {
  const viewBox = parseViewBox(root)
  const rootChildCount = root.childElementCount
  const textNodes = Array.from(root.querySelectorAll('text'))
    .map(node => {
      const x = readNumericAttr(node, 'x')
      const y = readNumericAttr(node, 'y')
      if (x == null || y == null) return null
      const transformedPoint = applyMatrix(getNodeTransform(root, node), { x, y })
      return {
        text: node.textContent?.trim() || '',
        x: transformedPoint.x,
        y: transformedPoint.y,
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
    rootChildCount,
    textNodes,
    elementCounts: countElements(root, ['text', 'rect', 'line', 'path', 'polygon']),
    minTextToEdge,
  }
}
