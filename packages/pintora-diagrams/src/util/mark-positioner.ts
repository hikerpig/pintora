import { GSymbol, safeAssign, TRect, MarkType, MarkTypeMap, Point, createTranslation, mat3, Group } from '@pintora/core'

type TranformInfo = {
  offsets: Point
  scales: Point
  width: number
  height: number
}

export type MarkTransformer<K extends MarkType> = (mark: MarkTypeMap[K], info: TranformInfo) => void

export const MARK_TRANSFORMERS: Partial<{ [K in MarkType]: MarkTransformer<K> }> = {
  rect({ attrs }, info) {
    attrs.x = (attrs.x || 0) + info.offsets.x
    attrs.y = (attrs.y || 0) + info.offsets.y
  },
  circle({ attrs }, info) {
    attrs.x += info.offsets.x
    attrs.y += info.offsets.y
    if (info.scales.x) attrs.r *= info.scales.x
  },
  ellipse({ attrs, type }, info) {
    attrs.x += info.offsets.x
    attrs.y += info.offsets.y
    if (info.scales.x) attrs.rx *= info.scales.x
    if (info.scales.y) attrs.ry *= info.scales.y
  },
  line(mark, info) {
    const { attrs, type } = mark
    mark.matrix = createTranslation(info.offsets.x, info.offsets.y)
  },
  path(mark, info) {
    const { attrs, type } = mark
    const translateMatrix = createTranslation(info.offsets.x, info.offsets.y)
    const scaleMatrix = mat3.fromScaling(mat3.create(), [info.scales.x || 1, info.scales.y || 1])
    const matrix = mat3.multiply(mat3.create(), translateMatrix, scaleMatrix)
    mark.matrix = matrix
  },
}

type PositionOpts = {
  refBounds?: TRect
}

/**
 * Transform symbol to a dest position and size
 */
export function positionSymbol(sym: GSymbol, p: TRect, opts?: PositionOpts) {
  const { refBounds } = opts
  const group = sym.mark
  const oldBounds = refBounds || {
    x: group.attrs.x || 0,
    y: group.attrs.y || 0,
    width: group.attrs.width || null,
    height: group.attrs.height || null,
  }
  const offsets = {
    x: p.x - oldBounds.x,
    y: p.y - oldBounds.y,
  }

  const info: TranformInfo = {
    offsets: offsets,
    scales: {
      x: oldBounds.width === null ? null : p.width / oldBounds.width,
      y: oldBounds.height === null ? null : p.height / oldBounds.height,
    },
    width: p.width,
    height: p.height,
  }

  if (sym.transformPolicies?.all === 'scale') {
    const translateMatrix = createTranslation(info.offsets.x, info.offsets.y)
    const scaleMatrix = mat3.fromScaling(mat3.create(), [info.scales.x, info.scales.y])
    const matrix = mat3.multiply(mat3.create(), translateMatrix, scaleMatrix)
    group.matrix = matrix
  } else {
    group.children.forEach(mark => {
      const { type } = mark
      const transformer: MarkTransformer<typeof type> = MARK_TRANSFORMERS[type]
      // console.log('transformer', type, transformer, transformInfo)
      if (transformer) {
        transformer(mark, info)
      } else {
        const cAttrs = mark.attrs
        cAttrs.x = (cAttrs.x || 0) + offsets.x
        cAttrs.y = (cAttrs.y || 0) + offsets.y
      }
    })

    safeAssign(group.attrs, p)
  }
}

/**
 * Position group children
 */
export function positionGroupContents(group: Group, p: TRect) {
  const oldBounds = {
    x: group.attrs.x || 0,
    y: group.attrs.y || 0,
    width: group.attrs.width || null,
    height: group.attrs.height || null,
  }
  const offsets = {
    x: p.x - oldBounds.x,
    y: p.y - oldBounds.y,
  }

  const info: TranformInfo = {
    offsets: offsets,
    scales: {
      x: oldBounds.width === null ? null : p.width / oldBounds.width,
      y: oldBounds.height === null ? null : p.height / oldBounds.height,
    },
    width: p.width,
    height: p.height,
  }

  group.children.forEach(mark => {
    const { type } = mark
    const transformer: MarkTransformer<typeof type> = MARK_TRANSFORMERS[type]
    // console.log('transformer', type, transformer, info)
    if (transformer) {
      transformer(mark, info)
    } else {
      const cAttrs = mark.attrs
      cAttrs.x = (cAttrs.x || 0) + offsets.x
      cAttrs.y = (cAttrs.y || 0) + offsets.y
    }
  })

  safeAssign(group.attrs, p)
}
