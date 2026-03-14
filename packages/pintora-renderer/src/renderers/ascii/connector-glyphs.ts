import { ConnectorSemantic, ConnectorTerminatorKind } from '@pintora/core'
import { Charset } from './types'

export type HorizontalDirection = 'left' | 'right'
export type VerticalDirection = 'up' | 'down'

export function getConnectorShaftGlyph(connector: ConnectorSemantic, charset: Charset): string | null {
  if (connector.shaftStyle === 'dashed') {
    return charset === 'ascii' ? '-' : '╌'
  }
  return charset === 'ascii' ? '-' : '─'
}

export function getVerticalConnectorShaftGlyph(connector: ConnectorSemantic, charset: Charset): string | null {
  if (connector.shaftStyle === 'dashed') {
    return charset === 'ascii' ? ':' : '╎'
  }
  return charset === 'ascii' ? '|' : '│'
}

export function getHorizontalTerminatorGlyph(
  kind: ConnectorTerminatorKind,
  direction: HorizontalDirection,
  charset: Charset,
): string | null {
  const unicode = getUnicodeHorizontalTerminator(kind, direction)
  if (charset === 'unicode') return unicode
  return getAsciiHorizontalTerminator(kind, direction)
}

export function getVerticalTerminatorGlyph(
  kind: ConnectorTerminatorKind,
  direction: VerticalDirection,
  charset: Charset,
): string | null {
  const unicode = getUnicodeVerticalTerminator(kind, direction)
  if (charset === 'unicode') return unicode
  return getAsciiVerticalTerminator(kind, direction)
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

function getAsciiHorizontalTerminator(kind: ConnectorTerminatorKind, direction: HorizontalDirection): string | null {
  switch (kind) {
    case 'none':
      return ''
    case 'arrow-filled':
      return direction === 'right' ? '>' : '<'
    case 'arrow-open':
      return direction === 'right' ? ')' : '('
    case 'cross':
      return 'x'
    case 'er-only-one':
      return '|'
    case 'er-zero-or-one':
      return 'o|'
    case 'er-one-or-more':
      return direction === 'right' ? '}' : '{'
    case 'er-zero-or-more':
      return direction === 'right' ? 'o}' : 'o{'
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

function getAsciiVerticalTerminator(kind: ConnectorTerminatorKind, direction: VerticalDirection): string | null {
  switch (kind) {
    case 'none':
      return ''
    case 'arrow-filled':
      return direction === 'down' ? 'v' : '^'
    case 'arrow-open':
      return direction === 'down' ? 'v' : '^'
    case 'cross':
      return 'x'
    case 'er-only-one':
      return '-'
    case 'er-zero-or-one':
      return 'o-'
    case 'er-one-or-more':
      return direction === 'down' ? 'T' : 'T'
    case 'er-zero-or-more':
      return direction === 'down' ? 'oT' : 'oT'
    default:
      return null
  }
}
