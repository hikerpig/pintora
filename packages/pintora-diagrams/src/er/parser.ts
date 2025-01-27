import { genParserWithRules } from '../util/parser-util'
import db from './db'
import grammar from './parser/erDiagram'

export const parse = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
  postProcess(results) {
    db.apply(results)
    return results
  },
})
