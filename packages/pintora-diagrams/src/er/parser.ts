import nearley from 'nearley'
import db from './db'
import grammar, { setYY } from './parser/erDiagram'
import { compact } from '@pintora/core'

setYY(db)

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

export function parse(text: string) {
  parser.feed(text)
  return compact(parser.results)
}

export default parser
