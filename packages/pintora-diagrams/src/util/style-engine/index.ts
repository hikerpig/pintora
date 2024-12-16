import { MarkAttrs, type GraphicsIR, type Mark, type MarkType, type MarkTypeMap } from '@pintora/core'

import { StylableAttrKey, StyleRule } from './shared'

/**
 * text mark applicable style -> attr mapping
 */
const TEXT_MARK_STYLE_MAP: Partial<Record<StylableAttrKey, keyof MarkAttrs>> = {
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
  fontStyle: 'fontStyle',
  textColor: 'fill',
  opacity: 'opacity',
}

/**
 * rect mark applicable style -> attr mapping
 */
const RECT_MARK_STYLE_MAP: Partial<Record<StylableAttrKey, keyof MarkAttrs>> = {
  backgroundColor: 'fill',
  borderColor: 'stroke',
  opacity: 'opacity',
}

export class StyleEngine {
  apply(rootMark: Mark, rules: StyleRule[] | undefined) {
    if (!rules) return rootMark
    const actions = {}
    const classRules = rules.filter(rule => rule.selector.type === 'class')
    const idRules = rules.filter(rule => rule.selector.type === 'id')
    traverseMark(
      rootMark,
      {
        default: (mark, actions) => {
          if (classRules.length && mark.class) {
            const classes = mark.class ? mark.class.split(' ') : []
            classes.forEach(className => {
              const rule = classRules.find(rule => rule.selector.target === className)
              if (rule) {
                this.applyRuleToMark(mark, rule)
              }
            })
          }

          if (idRules.length && mark.itemId) {
            const rule = idRules.find(rule => rule.selector.target === mark.itemId)
            if (rule) {
              this.applyRuleToMark(mark, rule)
            }
          }
        },
      },
      actions,
    )
    return rootMark
  }
  protected applyRuleToMark(mark: Mark, rule: StyleRule) {
    // console.log('applyRuleToMark', mark, rule)

    traverseMark(
      mark,
      {
        text(mark) {
          for (const [styleKey, value] of Object.entries(rule.attrs)) {
            if (styleKey in TEXT_MARK_STYLE_MAP) {
              mark.attrs[TEXT_MARK_STYLE_MAP[styleKey]] = value
            }
          }
        },
        rect(mark) {
          for (const [styleKey, value] of Object.entries(rule.attrs)) {
            if (styleKey in RECT_MARK_STYLE_MAP) {
              mark.attrs[RECT_MARK_STYLE_MAP[styleKey]] = value
            }
          }
        },
      },
      {},
    )
  }
}

type Visitor<T extends Mark, Actions = unknown> = {
  enter(mark: T, actions?: Actions): boolean | void
  exit?(mark: T, actions?: Actions): void
}
type VisitorInput<T extends Mark> = Visitor<T> | Visitor<T>['enter']

type Visitors = {
  [K in MarkType]: VisitorInput<K extends keyof MarkTypeMap ? MarkTypeMap[K] : Mark>
}

function traverseMark<Actions = unknown>(
  mark: Mark,
  visitors: Partial<Visitors> & { default?: VisitorInput<Mark> },
  actions: Actions,
) {
  const visitor = visitors[mark.type] || visitors.default
  let visitorEnter: Visitor<Mark>['enter'] | undefined
  let visitorExit
  if (visitor) {
    if (typeof visitor === 'function') {
      visitorEnter = visitor
    } else {
      visitorEnter = visitor.enter
      visitorExit = visitor.exit
    }
  }
  if (visitorEnter) {
    visitorEnter(mark, actions)
  }
  if (mark.type === 'group' && mark.children) {
    mark.children.forEach(child => {
      traverseMark(child, visitors, actions)
    })
  }
  if (visitorExit) {
    visitorExit(mark, actions)
  }
}
