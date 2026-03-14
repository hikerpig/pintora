import { DIAGONAL_BACKWARD, DIAGONAL_FORWARD, DIR_E, DIR_N, DIR_S, DIR_W } from './types'

const LINE_GLYPH_BY_MASK: Record<number, string> = {
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

const LINE_MASK_BY_GLYPH: Record<string, number> = Object.entries(LINE_GLYPH_BY_MASK).reduce(
  (acc, [mask, glyph]) => {
    const numericMask = Number(mask)
    acc[glyph] = (acc[glyph] || 0) | numericMask
    return acc
  },
  {} as Record<string, number>,
)

export function resolveLineGlyph(mask: number): string {
  return LINE_GLYPH_BY_MASK[mask] || '·'
}

function resolveLineMask(glyph: string): number {
  return LINE_MASK_BY_GLYPH[glyph] || 0
}

export function mergeGlyph(a: string, b: string): string {
  if (!a || a === ' ') return b
  if (!b || b === ' ') return a

  const mergedMask = resolveLineMask(a) | resolveLineMask(b)
  if (mergedMask > 0) {
    return resolveLineGlyph(mergedMask)
  }
  return b
}

export function resolveDiagonalGlyph(mask: number): string {
  if (mask === DIAGONAL_FORWARD) return '/'
  if (mask === DIAGONAL_BACKWARD) return '\\'
  return '╳'
}
