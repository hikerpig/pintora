import { IDiagram } from '@pintora/core'
import db, { ErDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'

type ErConf = {}

export { ErDiagramIR, ErConf }

export const erDiagram: IDiagram<ErDiagramIR, ErConf> = {
  pattern: /^\s*erDiagram/,
  parser: {
    parse(text, config) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  db,
  clear() {
    db.clear()
  },
}
