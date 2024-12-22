import { BaseDb, type MakeAction } from '../base-db'
import { genParserWithRules } from '../parser-util'
import { BindRule, StyleRule, type StyleSelector } from './shared'
import grammar from './grammar/style-test'
import { StylePayloads, STYLE_ACTION_HANDLERS } from './parser'

const parseFn = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
})

export type ParserStyleRule = {
  selector: StyleSelector
  attrs: Array<{
    key: string
    value: string
  }>
}

export type Action = MakeAction<StylePayloads>

export type StyleData = {
  styleRules: StyleRule[]
  bindRules: BindRule[]
}

export class StyleDb extends BaseDb {
  styleRules: StyleRule[] = []
  bindRules: BindRule[] = []

  private ACTION_HANDLERS = STYLE_ACTION_HANDLERS

  apply(action: Action | Action[]) {
    if (!action) return
    if (Array.isArray(action)) {
      action.forEach(a => this.apply(a))
      return
    }
    if (action.type in this.ACTION_HANDLERS) {
      this.ACTION_HANDLERS[action.type].call(this, action as any)
    }
  }

  getData() {
    return this.getBaseDiagramIR()
  }
}

export class StyleParse {
  static parse(text: string) {
    const actions = parseFn(text)
    const styleDb = new StyleDb()
    styleDb.apply(actions)
    return styleDb.getData()
  }
}
