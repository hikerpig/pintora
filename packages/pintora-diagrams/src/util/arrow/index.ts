import { MarkAttrs, Point, Path, PathCommand } from '@pintora/core'

export type ArrowType = 'default' | 'triangle' | 'etriangle' | 'box' | 'obox' | 'dot' | 'odot' | 'diamond' | 'ediamond'

type DrawArrowOpts = {
  type?: ArrowType
  attrs?: Partial<MarkAttrs>
  color?: string
  bgColor?: string
}

type ArrowHeadDrawer = (context: ArrowHeadDrawContext) => {
  path: PathCommand[]
  attrs: Partial<MarkAttrs>
  shapeStartPoint?: Point
}

type ArrowHeadDrawContext = {
  x: number
  y: number
  color: string
  bgColor: string
  baseLength: number
  xOffset: number
  type: ArrowType
  arrowTypeRegistry: ArrowTypeRegistry
}

/**
 * Will point to dest
 */
export function drawArrowTo(dest: Point, baseLength: number, rad: number, opts: DrawArrowOpts): Path {
  const xOffset = (baseLength / 2) * Math.tan(Math.PI / 3)
  const { type = 'default', color = 'transparent', bgColor = 'transparent' } = opts

  // Build the arrow in local coordinates first, then rotate + translate to destination.
  const context: ArrowHeadDrawContext = { x: 0, y: 0, baseLength, color, bgColor, type, xOffset, arrowTypeRegistry }

  const result = arrowTypeRegistry.draw(context)
  return {
    type: 'path',
    attrs: {
      ...(result.attrs || {}),
      ...(opts.attrs || {}),
      path: transformPathCommands(result.path || [], rad, dest),
    },
  }
}

function transformPathCommands(path: PathCommand[], rad: number, dest: Point): PathCommand[] {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const degree = (rad * 180) / Math.PI

  const rotate = (x: number, y: number) => {
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    }
  }

  const rotateAndTranslate = (x: number, y: number) => {
    const p = rotate(x, y)
    return {
      x: p.x + dest.x,
      y: p.y + dest.y,
    }
  }

  return path.map(command => {
    const type = command[0]
    if (type === 'M' || type === 'L') {
      const p = rotateAndTranslate(command[1], command[2])
      return [type, p.x, p.y]
    }
    if (type === 'm' || type === 'l') {
      const p = rotate(command[1], command[2])
      return [type, p.x, p.y]
    }
    if (type === 'C') {
      const p1 = rotateAndTranslate(command[1], command[2])
      const p2 = rotateAndTranslate(command[3], command[4])
      const p3 = rotateAndTranslate(command[5], command[6])
      return [type, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
    }
    if (type === 'c') {
      const p1 = rotate(command[1], command[2])
      const p2 = rotate(command[3], command[4])
      const p3 = rotate(command[5], command[6])
      return [type, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
    }
    if (type === 'A') {
      const p = rotateAndTranslate(command[6], command[7])
      return [type, command[1], command[2], command[3] + degree, command[4], command[5], p.x, p.y]
    }
    if (type === 'a') {
      const p = rotate(command[6], command[7])
      return [type, command[1], command[2], command[3] + degree, command[4], command[5], p.x, p.y]
    }
    return command
  }) as PathCommand[]
}

const defaultHeadDrawer: ArrowHeadDrawer = context => {
  const { x, y, color, baseLength } = context
  const xOffset = (baseLength / 2) * Math.tan(Math.PI / 3)
  // shape like ->
  const path: PathCommand[] = [
    ['M', x - xOffset, y - baseLength / 2], // top
    ['L', x, y], // right
    ['L', x - xOffset, y + baseLength / 2], // bottom
  ]
  return {
    path,
    attrs: { stroke: color, lineCap: 'round' },
  }
}

class ArrowTypeRegistry {
  drawers: Record<string, ArrowHeadDrawer> = {}

  register(type: ArrowType, drawer: ArrowHeadDrawer) {
    this.drawers[type] = drawer
  }

  draw(context: ArrowHeadDrawContext) {
    const drawer = (context.type ? this.drawers[context.type] : null) || defaultHeadDrawer
    const result = drawer(context)
    return result
  }
}

export const arrowTypeRegistry = new ArrowTypeRegistry()
arrowTypeRegistry.register('triangle', context => {
  const { x, y, xOffset, baseLength, color } = context
  const path: PathCommand[] = [
    ['M', x - xOffset, y - baseLength / 2], // top
    ['L', x - xOffset, y + baseLength / 2], // bottom
    ['L', x, y], // right
    ['Z'],
  ]
  return {
    path,
    attrs: { fill: color },
  }
})
arrowTypeRegistry.register('etriangle', makeStrokeDrawer('triangle'))
arrowTypeRegistry.register('box', context => {
  const { x, y, baseLength, color } = context
  const side = baseLength
  const path: PathCommand[] = [
    ['M', x - side, y - side / 2], // left top
    ['L', x - side, y + side / 2], // left bottom
    ['L', x, y + side / 2], // right bottom
    ['L', x, y - side / 2], // right top
    ['Z'],
  ]
  return {
    path,
    attrs: { fill: color },
  }
})
arrowTypeRegistry.register('obox', makeStrokeDrawer('box'))

arrowTypeRegistry.register('dot', context => {
  const { x, y, baseLength, color } = context
  const radius = baseLength / 2
  const startX = x - radius * 2
  const path: PathCommand[] = [
    ['M', startX, y],
    ['A', radius, radius, 0, 0, 0, x, y],
    ['A', radius, radius, 0, 0, 0, startX, y],
  ]
  return {
    path,
    attrs: { fill: color },
  }
})

arrowTypeRegistry.register('odot', makeStrokeDrawer('dot'))

arrowTypeRegistry.register('diamond', context => {
  const { x, y, baseLength, xOffset, color } = context
  const halfW = xOffset
  const halfH = baseLength / 2
  const centerX = x - halfW
  const path: PathCommand[] = [
    ['M', centerX - halfW, y],
    ['l', halfW, halfH],
    ['l', halfW, -halfH],
    ['l', -halfW, -halfH],
    ['Z'],
  ]
  return {
    path,
    attrs: { fill: color },
  }
})

function makeStrokeDrawer(fromType: ArrowType): ArrowHeadDrawer {
  return context => {
    const result = context.arrowTypeRegistry.draw({ ...context, type: fromType })
    result.attrs = { stroke: context.color, fill: context.bgColor }
    return result
  }
}

arrowTypeRegistry.register('ediamond', makeStrokeDrawer('diamond'))
