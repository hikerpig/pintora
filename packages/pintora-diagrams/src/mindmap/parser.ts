import { genParserWithRules } from '../util/parser-util'
import { ParserWithPreprocessor } from '../util/preproccesor'
import db from './db'
import grammar from './parser/mindmap'

export const parse = genParserWithRules(grammar, {
  postProcess(results) {
    db.apply(results as any)
    return results
  },
})

export const parser = new ParserWithPreprocessor({
  db,
  parse,
})
