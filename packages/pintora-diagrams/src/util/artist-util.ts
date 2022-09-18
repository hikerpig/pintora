import {
  Mark,
  MarkAttrs,
  Rect,
  Text,
  Point,
  Path,
  PathCommand,
  createRotateAtPoint,
  TSize,
  makeMark,
  Group,
  mat3,
  Bounds,
  Circle,
  ITheme,
  DiagramArtistOptions,
} from '@pintora/core'
import { toFixed } from './number'
import { PALETTE } from './theme'
export type { ArrowType } from './arrow'
export { arrowTypeRegistry, drawArrowTo } from './arrow'

export { makeMark }

export function getBaseText(): Text['attrs'] {
  return {
    x: 0,
    y: 0,
    text: '',
    fill: PALETTE.normalDark,
  }
}

/**
 * Will point to dest
 */
export function drawCrossTo(dest: Point, baseLength: number, rad: number, attrs?: Partial<MarkAttrs>): Path {
  const { x, y } = dest
  const offset = baseLength / 2
  const p: PathCommand[] = [
    ['M', x - offset, y - offset],
    ['L', x + offset, y + offset],
    ['M', x + offset, y - offset],
    ['L', x - offset, y + offset],
  ]

  const matrix = createRotateAtPoint(x, y, rad)
  return {
    type: 'path',
    matrix,
    attrs: {
      ...(attrs || {}),
      path: p,
    },
  }
}

export function drawDiamondTo(dest: Point, halfW: number, attrs: Partial<MarkAttrs>): Path {
  const width = halfW * 2
  const centerX = dest.x
  const centerY = dest.y

  const diamondMark = makeMark('path', {
    ...attrs,
    width: width,
    height: width,
    /* prettier-ignore */
    path: [
      ['m', centerX - halfW, centerY],
      ['l', halfW, halfW],
      ['l', halfW, -halfW],
      ['l', -halfW, -halfW],
      ['Z'],
    ],
  })
  return diamondMark
}

/**
 * Given start and end point, return the angle of the direction vector, in radian
 */
export function calcDirection(start: Point, end: Point) {
  const ox = end.x - start.x
  const oy = end.y - start.y

  let r = Math.atan(oy / ox)
  if (ox < 0) {
    r = r + Math.PI
  }
  // console.log('ox', ox, 'oy', oy, 'r', r)
  return r
}

// export enum Quardrant {
//   First = 1,
//   Second = 2,
//   Third = 3,
//   Fourth = 4,
// }

// export function getQuardrant(rad: number): Quardrant {
//   const r = (rad + 2 * Math.PI) % (Math.PI * 2)
//   const part = Math.floor(r / (Math.PI / 2))
//   if (part === 1) return Quardrant.Second
//   if (part === 2) return Quardrant.Third
//   if (part === 3) return Quardrant.Fourth
//   return Quardrant.First
// }

export function makeLabelBg(labelDims: TSize, center: Point, attrs: Partial<Rect['attrs']> = {}, theme?: ITheme) {
  let fill = '#fff'
  if (theme) {
    fill = theme.canvasBackground || theme.background1 || (theme.isDark ? '#000' : '#fff')
  }

  const labelBg = makeMark(
    'rect',
    {
      x: center.x - labelDims.width / 2,
      y: center.y - labelDims.height / 2,
      width: labelDims.width,
      height: labelDims.height + 2,
      fill,
      opacity: 0.85,
      ...attrs,
    },
    { class: 'label-bg' },
  )
  return labelBg
}

/**
 * A util function to adjust rootMark's position and size
 *   according to dagre graph's layout information and container size,
 * so that the visual content is well positioned in the canvas
 */
export function adjustRootMarkBounds({
  rootMark,
  gBounds,
  padX,
  padY,
  containerSize,
  useMaxWidth,
  titleSize,
}: {
  rootMark: Group
  gBounds: Bounds
  padX: number
  padY: number
  containerSize?: DiagramArtistOptions['containerSize']
  useMaxWidth?: boolean
  titleSize?: TSize
}) {
  const containerWidth = containerSize?.width
  const doublePadX = padX * 2
  const titleHeight = titleSize?.height || 0
  const titleWidth = titleSize?.width || 0
  const scaleX = useMaxWidth && containerWidth ? containerWidth / Math.max(gBounds.width + doublePadX, titleWidth) : 1
  rootMark.matrix = mat3.translate(mat3.create(), mat3.fromScaling(mat3.create(), [scaleX, scaleX]), [
    -Math.min(0, gBounds.left) + padX / scaleX,
    -Math.min(0, gBounds.top) + padY / scaleX + titleHeight,
  ])
  const width = Math.max(gBounds.width + doublePadX, titleWidth) * scaleX
  return {
    width,
    height: gBounds.height * scaleX + padY * 2 + (titleSize?.height || 0),
  }
}

export function makeEmptyGroup() {
  return makeMark('group', { x: 0, y: 0 }, { children: [] })
}

export function makeCircle(attrs: Partial<Circle['attrs']>) {
  return makeMark('circle', { x: 0, y: 0, r: 0, ...attrs })
}

export const getBaseNote = function (theme: ITheme): Rect['attrs'] {
  return {
    x: 0,
    y: 0,
    fill: theme.noteBackground || theme.groupBackground,
    stroke: theme.primaryBorderColor,
    width: 50,
    anchor: 'start',
    height: 50,
    rx: 0,
    ry: 0,
  }
}

/**
 * can be used to create position marker
 */
export function makeCircleInPoint(p: Point, opts: Partial<Circle['attrs']> = {}) {
  return makeMark('circle', {
    x: p.x,
    y: p.y,
    r: 4,
    fill: 'red',
    ...opts,
  })
}

/**
 * can be used to create position marker
 */
export function makeCircleWithCoordInPoint(p: Point, opts: Partial<Circle['attrs']> = {}) {
  const g = makeEmptyGroup()
  g.children.push(
    makeCircleInPoint(p, opts),
    makeMark('text', {
      text: `${Math.floor(p.x)}, ${Math.floor(p.y)}`,
      x: p.x,
      y: p.y,
      fill: 'red',
      textAlign: 'center',
      ...opts,
    }),
  )
  return g
}

export type Layer = {
  zIndex: number
  marks: Mark[]
}

export class LayerManager<Name extends string = string> {
  protected layers: Record<string, Layer> = {}
  addLayer(name: Name, zIndex: number) {
    if (!this.layers[name]) {
      this.layers[name] = { zIndex: 0, marks: [] }
    }
    this.layers[name].zIndex = zIndex
    return this.layers[name]
  }
  getLayer(name: Name) {
    return this.layers[name]
  }
  sortLayerMarks() {
    const layerList = Object.values(this.layers).sort((a, b) => a.zIndex - b.zIndex)
    const marks: Mark[] = layerList.reduce((acc, layer) => {
      acc.push(...layer.marks)
      return acc
    }, [])
    return marks
  }
  addMark(name: Name, mark: Mark) {
    this.getLayer(name)?.marks.push(mark)
  }
}

/**
 * by default upwards
 */
export function makeTriangle(center: Point, baseLength: number, rad: number, attrs: Partial<MarkAttrs>) {
  const { x, y } = center
  const offsetX = toFixed(baseLength / 2)
  const offsetY = (baseLength * Math.sign(Math.PI / 3)) / 2
  const p: PathCommand[] = [
    ['M', x, y - offsetY], // top
    ['L', x - offsetX, y + offsetY],
    ['L', x + offsetX, y + offsetY],
    ['Z'],
  ]

  const matrix = createRotateAtPoint(x, y, rad)
  const mark = makeMark(
    'path',
    {
      ...(attrs || {}),
      path: p,
    },
    { matrix },
  )
  return {
    mark,
    width: baseLength,
    height: offsetY * 2,
  }
}

export function makeTextAtPoint(text: string, p: Point, attrs: Partial<Text['attrs']> = {}) {
  return makeMark('text', {
    x: p.x,
    y: p.y,
    text,
    fill: PALETTE.normalDark,
    textAlign: 'center',
    textBaseline: 'middle',
    ...attrs,
  })
}
