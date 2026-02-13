import { textDisplayWidth } from '../char-width'
import { calcTextTopLeft } from '../text-layout'

describe('text layout', () => {
  it('calculates display width for latin and cjk text', () => {
    expect(textDisplayWidth('abc')).toBe(3)
    expect(textDisplayWidth('张三')).toBe(4)
  })

  it('calculates text top-left by align and baseline', () => {
    expect(calcTextTopLeft(100, 100, 40, 16, 'center', 'middle')).toEqual({ left: 80, top: 92 })
  })
})
