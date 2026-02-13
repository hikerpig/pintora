import { GraphicsIR } from '@pintora/core'
import { collectDrawOps } from './mark-walker'
import { rasterize } from './rasterizer'
import { IDENTITY_MATRIX } from './types'
import { TextRendererOptions } from './config'

export function renderText(ir: GraphicsIR, options: TextRendererOptions): string {
  const cols = Math.max(1, Math.round(ir.width / options.cellWidth) + 2)
  const rows = Math.max(1, Math.round(ir.height / options.cellHeight) + 2)
  const ops = collectDrawOps(ir.mark, IDENTITY_MATRIX)
  const grid = rasterize(ops, {
    charset: options.charset,
    cellWidth: options.cellWidth,
    cellHeight: options.cellHeight,
    cols,
    rows,
    trimRight: options.trimRight,
  })
  return grid.toString()
}
