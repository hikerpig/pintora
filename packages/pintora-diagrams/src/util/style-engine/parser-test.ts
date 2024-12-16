import { type ActionHandler, type MakeAction } from '../base-db'
import { genParserWithRules } from '../parser-util'
import { StyleRule, type StyleSelector } from './shared'
import grammar from './grammar/style-test'
import { StylePayloads, IStyleDb } from './parser'

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
}

export const STYLE_ACTION_HANDLERS: {
  [K in keyof StylePayloads]: ActionHandler<StylePayloads, IStyleDb, K>
} = {
  style(action) {
    // 处理添加样式的逻辑
    const rules: StyleRule[] = []
    action.rules.forEach(rule => {
      rules.push({
        selector: rule.selector,
        attrs: rule.attrs.reduce((previous, current) => {
          previous[current.key] = current.value
          return previous
        }, {}),
      })
    })
    this.styleRules.push(...rules)
  },
}

export class StyleDb {
  styleRules: StyleRule[] = []

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

  getData(): StyleData {
    return {
      styleRules: this.styleRules,
    }
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
