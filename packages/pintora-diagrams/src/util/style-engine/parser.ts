import { type ActionHandler, type MakeAction } from '../base-db'
import { StyleRule, type StyleSelector, BindRule } from './shared'

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
  bindClass: {
    nodes: string[]
    className: string
  }
}

export type Action = MakeAction<StylePayloads>

export interface IStyleDb {
  styleRules: StyleRule[]
  bindRules: BindRule[]
}

export const STYLE_ACTION_HANDLERS: {
  [K in keyof StylePayloads]: ActionHandler<StylePayloads, IStyleDb, K>
} = {
  style(action) {
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
  bindClass(action) {
    this.bindRules.push({
      nodes: action.nodes,
      className: action.className,
    })
  },
}
