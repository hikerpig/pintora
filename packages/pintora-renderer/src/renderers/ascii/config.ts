import { PintoraConfig } from '@pintora/core'
import { Charset } from './types'

export type TextRendererOptions = {
  charset: Charset
  cellWidth: number
  cellHeight: number
  trimRight: boolean
  ansi: boolean
}

export function resolveTextRendererOptions(config?: Partial<PintoraConfig> | unknown): TextRendererOptions {
  const c = (config as any)?.core?.textRenderer || {}

  return {
    charset: c.charset === 'ascii' ? 'ascii' : 'unicode',
    cellWidth: c.cellWidth && c.cellWidth > 0 ? c.cellWidth : 8,
    cellHeight: c.cellHeight && c.cellHeight > 0 ? c.cellHeight : 16,
    trimRight: c.trimRight !== false,
    ansi: false,
  }
}
