import { MarkTypeMap, Mark, Group } from '../types/graphics'

export function makeMark<T extends keyof MarkTypeMap, M extends MarkTypeMap[T]>(
  type: T,
  attrs: M['attrs'],
  other?: Partial<M>,
) {
  return {
    type,
    ...(other || {}),
    attrs,
  } as M
}

export function cloneMark<T extends Mark | Group>(mark: T): T {
  const newMark: any = {
    ...mark,
    attrs: { ...mark.attrs },
  }
  if ('children' in mark) {
    newMark.children = (mark as any).children.map((child: any) => cloneMark(child))
  }
  return newMark
}

// function scalePathCommand<T extends PathCommand>(c: T, scale: number): T {
//   const [command, ...numbers] = c
//   return [command, ...numbers.map(n => n * scale)] as T
// }
