import { IDiagram } from '@pintora/core'
import db, { ErDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, ErConf } from './config'

export { ErDiagramIR, ErConf }

export const erDiagram: IDiagram<ErDiagramIR, ErConf> = {
  pattern: /^\s*erDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey,
  clear() {
    db.clear()
  },
}
