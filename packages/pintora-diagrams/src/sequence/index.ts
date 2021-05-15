import pintora, { IDiagram } from "@pintora/core"
import yy, { db, SequenceDiagramIR } from './db'
import artist from './artist'
// import { Parser } from './parser/sequenceDiagram'
import * as PARSER from './parser/sequenceDiagram'

// PARSER.Parser.yy = yy
PARSER.setYY(yy)

export type SequenceConf = {
  width: number
  height: number
  mirrorActors: boolean
  actorMargin: number
  boxMargin: number
  activationWidth: number

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: number | string
}

export {
  SequenceDiagramIR
}

export const sequenceDiagram: IDiagram<SequenceDiagramIR, SequenceConf> = {
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