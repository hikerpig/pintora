import { textDisplayWidth } from '../char-width'
import { measureAsciiText } from '../text-metrics'
import { calcTextTopLeft, resolveTextPlacement, snapTextTopLeftToGrid } from '../text-layout'

describe('text layout', () => {
  it('calculates display width for latin and cjk text', () => {
    expect(textDisplayWidth('abc')).toBe(3)
    expect(textDisplayWidth('张三')).toBe(4)
  })

  it('calculates text top-left by align and baseline', () => {
    expect(calcTextTopLeft(100, 100, 40, 16, 'center', 'middle')).toEqual({ left: 80, top: 92 })
  })

  it('measures ascii text by actual displayed cells', () => {
    expect(
      measureAsciiText('render this', {
        cellWidth: 8,
        cellHeight: 16,
      }),
    ).toMatchObject({
      textWidthCells: 11,
      textWidth: 88,
      textHeightRows: 1,
      textHeight: 16,
      lineHeightRows: 1,
    })
  })

  it('snaps top-aligned and middle-aligned text inside the next grid row', () => {
    expect(snapTextTopLeftToGrid(32.1, 48.1, 8, 16, 'left', 'top')).toEqual({ col: 5, row: 4 })
    expect(snapTextTopLeftToGrid(80, 92, 8, 16, 'center', 'middle')).toEqual({ col: 10, row: 6 })
  })

  it('snaps hanging baseline text to nearest row instead of always pushing down', () => {
    expect(snapTextTopLeftToGrid(32, 85.829, 8, 16, 'left', 'hanging')).toEqual({ col: 4, row: 5 })
  })

  it('resolves final text placement from anchor semantics', () => {
    expect(
      resolveTextPlacement({
        x: 100,
        y: 100,
        width: 40,
        height: 16,
        cellWidth: 8,
        cellHeight: 16,
        textAlign: 'center',
        textBaseline: 'middle',
      }),
    ).toEqual({
      left: 80,
      top: 92,
      col: 10,
      row: 6,
    })
  })
})
