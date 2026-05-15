import db from './db'
import grammar, { setYY } from './parser/c4Diagram'
import { genParserWithRules } from '../util/parser-util'
import type { C4Action } from './type'

setYY(db)

type C4ParseResult = {
  entry: string
  actions: C4Action[]
}

export const parse = genParserWithRules<C4ParseResult>(grammar, {
  postProcess(results) {
    const result = results[0]
    if (result) {
      db.setDiagramEntry(result.entry)
      db.apply(result.actions)
    }
    db.finalize()
    return results
  },
})
