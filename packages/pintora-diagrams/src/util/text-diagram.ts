export type TextDiagramPoint = { x: number; y: number }
type TextDiagramOp = import('@pintora/core').TextDiagramOp

export function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function textOp(x: number, y: number, text: string, align?: 'left' | 'center' | 'right'): TextDiagramOp {
  return align ? { type: 'text', x, y, text, align } : { type: 'text', x, y, text }
}

export function lineOp(
  from: TextDiagramPoint,
  to: TextDiagramPoint,
  extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
): TextDiagramOp {
  return { type: 'line', from, to, ...extra }
}

export function rectOp(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke?: 'solid' | 'dashed',
): TextDiagramOp {
  return stroke ? { type: 'rect', x, y, width, height, stroke } : { type: 'rect', x, y, width, height }
}

export function fillOp(x: number, y: number, width: number, height: number, char: string): TextDiagramOp {
  return { type: 'fill', x, y, width, height, char }
}

export function translateTextDiagramOps(ops: TextDiagramOp[], dx: number, dy: number): TextDiagramOp[] {
  return ops.map(op => {
    if (op.type === 'text') return { ...op, x: op.x + dx, y: op.y + dy }
    if (op.type === 'rect' || op.type === 'fill') return { ...op, x: op.x + dx, y: op.y + dy }
    return {
      ...op,
      from: { x: op.from.x + dx, y: op.from.y + dy },
      to: { x: op.to.x + dx, y: op.to.y + dy },
    }
  })
}
