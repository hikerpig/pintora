import { Charset, DIAGONAL_BACKWARD, DIAGONAL_FORWARD, DIR_E, DIR_N, DIR_S, DIR_W } from './types'

const UNICODE_LINE_GLYPH_BY_MASK: Record<number, string> = {
  [DIR_N]: '│',
  [DIR_S]: '│',
  [DIR_N | DIR_S]: '│',
  [DIR_E]: '─',
  [DIR_W]: '─',
  [DIR_E | DIR_W]: '─',
  [DIR_E | DIR_S]: '┌',
  [DIR_W | DIR_S]: '┐',
  [DIR_E | DIR_N]: '└',
  [DIR_W | DIR_N]: '┘',
  [DIR_N | DIR_E | DIR_S]: '├',
  [DIR_N | DIR_S | DIR_W]: '┤',
  [DIR_E | DIR_W | DIR_S]: '┬',
  [DIR_E | DIR_W | DIR_N]: '┴',
  [DIR_N | DIR_E | DIR_S | DIR_W]: '┼',
}

const UNICODE_LINE_MASK_BY_GLYPH: Record<string, number> = Object.entries(UNICODE_LINE_GLYPH_BY_MASK).reduce(
  (acc, [mask, glyph]) => {
    const numericMask = Number(mask)
    acc[glyph] = (acc[glyph] || 0) | numericMask
    return acc
  },
  {} as Record<string, number>,
)

function resolveAsciiLineGlyph(mask: number): string {
  if (mask === 0) return ' '
  if ((mask & (DIR_N | DIR_S)) > 0 && (mask & (DIR_E | DIR_W)) > 0) return '+'
  if ((mask & (DIR_N | DIR_S)) > 0) return '|'
  if ((mask & (DIR_E | DIR_W)) > 0) return '-'
  return '+'
}

export function resolveLineGlyph(mask: number, charset: Charset): string {
  if (charset === 'ascii') return resolveAsciiLineGlyph(mask)
  return UNICODE_LINE_GLYPH_BY_MASK[mask] || '·'
}

function resolveLineMask(glyph: string, charset: Charset): number {
  if (charset === 'ascii') {
    if (glyph === '-') return DIR_E | DIR_W
    if (glyph === '|') return DIR_N | DIR_S
    if (glyph === '+') return DIR_N | DIR_E | DIR_S | DIR_W
    return 0
  }
  return UNICODE_LINE_MASK_BY_GLYPH[glyph] || 0
}

export function mergeGlyph(a: string, b: string, charset: Charset): string {
  if (!a || a === ' ') return b
  if (!b || b === ' ') return a

  const mergedMask = resolveLineMask(a, charset) | resolveLineMask(b, charset)
  if (mergedMask > 0) {
    return resolveLineGlyph(mergedMask, charset)
  }
  return b
}

export function resolveDiagonalGlyph(mask: number, charset: Charset): string {
  if (mask === DIAGONAL_FORWARD) return '/'
  if (mask === DIAGONAL_BACKWARD) return '\\'
  return charset === 'ascii' ? 'x' : '╳'
}
