import { db } from './db'
import grammar, { setYY } from './parser/activityDiagram'
import { genParserWithRules } from '../util/parser-util'

setYY(db)

export const parse = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
  postProcess(results) {
    db.apply(results)
    return results
  },
})
