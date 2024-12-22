import { db } from './db'
import grammar from './parser/activityDiagram'
import { genParserWithRules } from '../util/parser-util'

export const parse = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
  postProcess(results) {
    db.apply(results)
    return results
  },
})
