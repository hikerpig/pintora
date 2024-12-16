import { type ActionHandler, type MakeAction } from '../base-db'
import { StyleRule, type StyleSelector } from './shared'

export type ParserStyleRule = {
  selector: StyleSelector
  attrs: Array<{
    key: string
    value: string
  }>
}

export type StylePayloads = {
  style: {
    rules: ParserStyleRule[]
  }
}

export type Action = MakeAction<StylePayloads>

export interface IStyleDb {
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
