import db from './db'
import grammar, { setYY } from './parser/componentDiagram'
import { genParserWithRules } from '../util/parser-util'

setYY(db)

export const parse = genParserWithRules(grammar)
