import pintora, { IDiagram } from "@pintora/core"
import yy, { db, SequenceDiagramIR } from './db'
import artist from './artist'
// import * as PARSER from './parser/sequenceDiagram'
import { parse } from './parser'
import { SequenceConf} from './config'

// PARSER.setYY(yy)

export {
  SequenceDiagramIR,
  SequenceConf
}

export const sequenceDiagram: IDiagram<SequenceDiagramIR, SequenceConf> = {
  pattern: /^\s*sequenceDiagram/,
  parser: {
    parse(text, config) {
      parse(text)
      return db.getDiagramIR()
    }
  },
  artist,
  db,
  clear() {
    db.clear()
  }
}
