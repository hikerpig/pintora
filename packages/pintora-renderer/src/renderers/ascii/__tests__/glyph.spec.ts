import { DIR_E, DIR_N, DIR_S, DIR_W } from '../types'
import { mergeGlyph, resolveLineGlyph } from '../glyph'

describe('glyph', () => {
  it('resolves unicode line glyphs from direction mask', () => {
    const maskNS = DIR_N | DIR_S
    const maskEW = DIR_E | DIR_W

    expect(resolveLineGlyph(maskNS, 'unicode')).toBe('│')
    expect(resolveLineGlyph(maskEW, 'unicode')).toBe('─')
  })

  it('merges crossing glyphs for unicode and ascii', () => {
    expect(mergeGlyph('─', '│', 'unicode')).toBe('┼')
    expect(mergeGlyph('-', '|', 'ascii')).toBe('+')
  })
})
