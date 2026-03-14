import { ConnectorSemantic, ConnectorTerminatorKind } from '@pintora/core'

export type HorizontalDirection = 'left' | 'right'
export type VerticalDirection = 'up' | 'down'

export function getConnectorShaftGlyph(connector: ConnectorSemantic): string | null {
  if (connector.shaftStyle === 'dashed') {
    return '╌'
  }
  return '─'
}

export function getVerticalConnectorShaftGlyph(connector: ConnectorSemantic): string | null {
  if (connector.shaftStyle === 'dashed') {
    return '╎'
  }
  return '│'
}

export function getHorizontalTerminatorGlyph(
  kind: ConnectorTerminatorKind,
  direction: HorizontalDirection,
): string | null {
  return getUnicodeHorizontalTerminator(kind, direction)
}

export function getVerticalTerminatorGlyph(kind: ConnectorTerminatorKind, direction: VerticalDirection): string | null {
  return getUnicodeVerticalTerminator(kind, direction)
}

function getUnicodeHorizontalTerminator(kind: ConnectorTerminatorKind, direction: HorizontalDirection): string | null {
  switch (kind) {
    case 'none':
      return ''
    case 'arrow-filled':
      return direction === 'right' ? '▶' : '◀'
    case 'arrow-open':
      return direction === 'right' ? '▷' : '◁'
    case 'cross':
      return 'x'
    case 'er-only-one':
      return '│'
    case 'er-zero-or-one':
      return '○│'
    case 'er-one-or-more':
      return direction === 'right' ? '╟' : '╢'
    case 'er-zero-or-more':
      return direction === 'right' ? '○╟' : '○╢'
    default:
      return null
  }
}

function getUnicodeVerticalTerminator(kind: ConnectorTerminatorKind, direction: VerticalDirection): string | null {
  switch (kind) {
    case 'none':
      return ''
    case 'arrow-filled':
      return direction === 'down' ? '▼' : '▲'
    case 'arrow-open':
      return direction === 'down' ? '▽' : '△'
    case 'cross':
      return 'x'
    case 'er-only-one':
      return '─'
    case 'er-zero-or-one':
      return '○─'
    case 'er-one-or-more':
      return direction === 'down' ? '╤' : '╧'
    case 'er-zero-or-more':
      return direction === 'down' ? '○╤' : '○╧'
    default:
      return null
  }
}
