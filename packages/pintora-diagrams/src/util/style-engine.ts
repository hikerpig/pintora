import { MarkAttrs, type GraphicsIR, type Mark, type MarkType, type MarkTypeMap } from '@pintora/core'

export type StylableAttrs = Pick<MarkAttrs, 'fill' | 'stroke' | 'opacity' | 'fontWeight' | 'fontFamily'>

type StyleSelector = {
  type: string
  target: string
}

class StyleRule {
  selector: StyleSelector
  attrs: Partial<StylableAttrs>
}

export class StyleEngine {
  apply(gir: GraphicsIR, rules: StyleRule[]) {
    const actions = {}
    const classRules = rules.filter(rule => rule.selector.type === 'class')
    traverseMark(
      gir.mark,
      {
        default: (mark, actions) => {
          if (classRules.length && mark.class) {
            const classes = mark.class && mark.class.split(' ')
            classes.forEach(className => {
              const rule = classRules.find(rule => rule.selector.target === className)
              if (rule) {
                this.applyRuleToMark(mark, rule)
              }
            })
          }
        },
      },
      actions,
    )
  }
  protected applyRuleToMark(mark: Mark, rule: StyleRule) {
    console.log('applyRuleToMark', mark, rule)
    mark.attrs = { ...mark.attrs, ...rule.attrs }
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
