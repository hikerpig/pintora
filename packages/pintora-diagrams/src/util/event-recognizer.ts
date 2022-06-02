import { IDiagramEvent, IDiagramEventRecognizer, Mark, IGraphicEvent } from '@pintora/core'

export type RecognizerRule<D = any> = {
  match(m: Mark): boolean
  createDiagramEvent(e: IGraphicEvent, m: Mark, ir: D): IDiagramEvent
}

export class BaseEventRecognizer<D> implements IDiagramEventRecognizer<D> {
  rules: RecognizerRule<D>[] = []

  recognize(e: IGraphicEvent, ir: D): undefined | IDiagramEvent<any, any> {
    let d: IDiagramEvent | undefined
    if (e.markPath) {
      for (const m of e.markPath) {
        if (m.itemId) {
          for (const rule of this.rules) {
            if (rule.match(m)) {
              d = rule.createDiagramEvent(e, m, ir)
            }
          }
          if (d) break
        }
      }
    }
    return d
  }

  addPatternRecognizerRule(pattern: RegExp, createDiagramEvent: RecognizerRule<D>['createDiagramEvent']) {
    const rule = {
      match(m: Mark) {
        return pattern.test(m.itemId)
      },
      createDiagramEvent,
    }
    this.rules.push(rule)
    return this
  }
}
