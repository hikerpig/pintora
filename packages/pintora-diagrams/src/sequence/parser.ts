import db from './db'
import grammar, { setYY } from './parser/sequenceDiagram'
import { genParserWithRules } from '../util/parser-util'

setYY(db)

export const parse = genParserWithRules(grammar, {
  postProcess(results) {
    let validResults = results
    // another hack to avoid duplicate results,
    // @FIXME: need to fix activityDiagram.ne grammar and remove this hack
    if (Array.isArray(results[0])) {
      validResults = results[0]
    }
    db.apply(validResults as any)
    return validResults
  },
})
