import grammar from './parser/gantt'
import { genParserWithRules } from '../util/parser-util'
import ganttDb from './db'

export const parse = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
  postProcess(results) {
    ganttDb.apply(results)
    return results
  },
})
