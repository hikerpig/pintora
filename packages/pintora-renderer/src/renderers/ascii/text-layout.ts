type TextAlign = 'start' | 'center' | 'end' | 'left' | 'right'
type TextBaseline = 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'

export type ResolvedTextPlacement = {
  left: number
  top: number
  col: number
  row: number
}

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

export function snapTextTopLeftToGrid(
  left: number,
  top: number,
  cellWidth: number,
  cellHeight: number,
  textAlign: TextAlign | string = 'left',
  textBaseline: TextBaseline | string = 'alphabetic',
): { col: number; row: number } {
  const colRaw = left / cellWidth
  const rowRaw = top / cellHeight

  let col = Math.round(colRaw)
  if (textAlign === 'left' || textAlign === 'start') {
    col = Math.ceil(colRaw)
  } else if (textAlign === 'right' || textAlign === 'end') {
    col = Math.floor(colRaw)
  }

  let row = Math.round(rowRaw)
  if (textBaseline === 'top' || textBaseline === 'middle') {
    row = Math.ceil(rowRaw)
  } else if (textBaseline === 'hanging') {
    row = Math.round(rowRaw)
  } else {
    row = Math.floor(rowRaw)
  }

  return { col, row }
}

export function resolveTextPlacement(params: {
  x: number
  y: number
  width: number
  height: number
  cellWidth: number
  cellHeight: number
  textAlign?: TextAlign | string
  textBaseline?: TextBaseline | string
}): ResolvedTextPlacement {
  const { x, y, width, height, cellWidth, cellHeight, textAlign = 'left', textBaseline = 'alphabetic' } = params
  const { left, top } = calcTextTopLeft(x, y, width, height, textAlign, textBaseline)
  const { col, row } = snapTextTopLeftToGrid(left, top, cellWidth, cellHeight, textAlign, textBaseline)
  return {
    left,
    top,
    col,
    row,
  }
}
