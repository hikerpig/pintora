import { Group, GSymbol, MarkAttrs } from './types/graphics'
import { logger } from './logger'
import { cloneMark } from './util/mark'
import { ContentArea, MarginObject } from './util'

export type SymbolDefBase = {
  modes?: SymbolMode[]
  styleMark?: StyleMarkFunction
  symbolMargin?: Partial<MarginObject>
}

/** Definition of graphic symbol prototype */
export type SymbolPrototypeDef = SymbolDefBase & {
  type: 'prototype'
  symbol: GSymbol
}

export type SymbolFactoryOpts = {
  mode: SymbolMode
}

/** Definition of graphic symbol factory */
export type SymbolFactoryDef = SymbolDefBase & {
  type: 'factory'
  /**
   * The factory to actually make the symbol
   * @param contentArea the content area rect, the anchor point x,y is the center of the area.
   *   usually the symbol is a wrapper around the content
   */
  factory(contentArea: ContentArea, opts: SymbolFactoryOpts): GSymbol
}

export type SymbolMode = 'container' | 'icon'

type StyleMarkFunction = (mark: Group, def: SymbolDef, attrs: SymbolStyleAttrs) => void

export type SymbolDef = SymbolPrototypeDef | SymbolFactoryDef

export interface SymbolStyleAttrs extends MarkAttrs {}

export class SymbolRegistry {
  protected symbols: Record<string, SymbolDef> = {}

  register(name: string, sym: SymbolDef) {
    if (this.symbols[name]) {
      logger.warn(`[pintora] duplicate symbol: ${name}`)
    }
    this.symbols[name] = sym
  }

  get(name: string) {
    return this.symbols[name]
  }

  getSymbols() {
    return this.symbols
  }

  /**
   * Create and instantiate a symbol mark
   */
  create(name: string, opts: { attrs: SymbolStyleAttrs, contentArea?: ContentArea, mode?: SymbolMode }): GSymbol | null {
    const { attrs, contentArea } = opts
    const def = this.symbols[name]
    if (!def) return null

    try {
      let sym: GSymbol | null = null
      if (def.type === 'factory') {
        const _position = contentArea || { x: 0, y: 0, width: 100, height: 100 }
        const mode = opts.mode || 'icon'
        sym = def.factory(_position, { mode })
      } else if (def.type === 'prototype') {
        sym = {
          ...def.symbol,
          mark: cloneMark(def.symbol.mark),
        }
      }

      if (sym && def.styleMark) {
        def.styleMark(sym.mark, def, attrs)
      }
      return sym
    } catch (error) {
      console.error('[symbolRegistry] error in create', error)
      return null
    }
  }
}

export const symbolRegistry = new SymbolRegistry()
