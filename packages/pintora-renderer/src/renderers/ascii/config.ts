import { PintoraConfig } from '@pintora/core'

export type TextRendererOptions = {
  cellWidth: number
  cellHeight: number
  trimRight: boolean
  ansi: boolean
}

export function resolveTextRendererOptions(config?: Partial<PintoraConfig> | unknown): TextRendererOptions {
  const c = (config as any)?.core?.textRenderer || {}

  return {
    cellWidth: c.cellWidth && c.cellWidth > 0 ? c.cellWidth : 8,
    cellHeight: c.cellHeight && c.cellHeight > 0 ? c.cellHeight : 16,
    trimRight: c.trimRight !== false,
    ansi: false,
  }
}
