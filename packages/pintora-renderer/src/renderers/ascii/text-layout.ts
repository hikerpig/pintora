type TextAlign = 'start' | 'center' | 'end' | 'left' | 'right'
type TextBaseline = 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'

export function calcTextTopLeft(
  x: number,
  y: number,
  width: number,
  height: number,
  textAlign: TextAlign | string = 'left',
  textBaseline: TextBaseline | string = 'alphabetic',
): { left: number; top: number } {
  let left = x
  if (textAlign === 'center') {
    left = x - width / 2
  } else if (textAlign === 'right' || textAlign === 'end') {
    left = x - width
  }

  let top = y
  if (textBaseline === 'middle') {
    top = y - height / 2
  } else if (textBaseline === 'top' || textBaseline === 'hanging') {
    top = y
  } else {
    top = y - height
  }

  return { left, top }
}
