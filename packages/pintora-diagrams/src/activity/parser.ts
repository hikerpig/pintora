import { db } from './db'
import grammar, { setYY, reset } from './parser/activityDiagram'
import { genParserWithRules } from '../util/parser-util'

setYY(db)

export const parse = genParserWithRules(grammar, {
  prepare() {
    reset()
  },
  postProcess(results) {
    db.apply(results as any)
    return results
  },
})
