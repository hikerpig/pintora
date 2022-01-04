import { db } from './db'
import grammar, { setYY } from './parser/activityDiagram'
import { genParserWithRules } from '../util/parser-util'

setYY(db)

export const parse = genParserWithRules(grammar, {
  postProcess(results) {
    db.apply(results as any)
    return results
  },
})
