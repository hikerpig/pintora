import pintora, { IDiagram } from "@pintora/core"
import yy, { db, SequenceDiagramIR } from './db'
import artist from './artist'
// import { Parser } from './parser/sequenceDiagram'
import * as PARSER from './parser/sequenceDiagram'

// PARSER.Parser.yy = yy
PARSER.setYY(yy)

export const sequenceDiagram: IDiagram<SequenceDiagramIR> = {
  pattern: /^\s*sequenceDiagram/,
  parser: {
    parse(text, config) {
      PARSER.parse(text)
      return db.getDiagramIR()
    }
  },
  artist,
  db,
}